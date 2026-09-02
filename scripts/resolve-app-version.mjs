#!/usr/bin/env node
/**
 * Décide le numéro de version que les écrans affichent, pour un déploiement donné.
 *
 * Pourquoi. Le déploiement posait cette question à semantic-release : « quelle version
 * viens-tu de publier ? » — et prenait son silence pour une absence de version. Or un
 * `chore:`, un `docs:`, un `test:` ou un `refactor:` ne coupent aucune release : le
 * silence est la réponse normale, pas une panne. L'ancien repli fabriquait alors un
 * `0.0.0-<sha>`, qui ressemble à une version cassée là où `v2.2.2` tournait bel et bien.
 *
 * La bonne question n'est pas « qu'est-ce qui vient d'être publié ? » mais **« qu'est-ce
 * qui tourne ici ? »**, et elle a toujours une réponse : le dernier tag atteignable
 * depuis le commit déployé.
 *
 * Une seule règle, deux appelants — `deploy.yml` pour la préproduction et `promote.yml`
 * pour la production. C'est cette unicité qui compte : les deux chemins calculaient la
 * version chacun de son côté, l'un rendant « 1.1.1 » et l'autre « v1.1.1 », d'où le
 * « vv1.1.1 » qui s'est affiché en production et les deux rustines qui en sont restées.
 *
 * Usage :
 *   node scripts/resolve-app-version.mjs --env staging --released 2.2.3
 *   node scripts/resolve-app-version.mjs --env production --sha 61a2458f
 *
 * Écrit `VITE_APP_VERSION=…` dans `$GITHUB_ENV` quand la variable existe, et rend
 * toujours la version sur la sortie standard — ce qui permet de l'appeler à la main
 * pour vérifier ce qu'un commit donné afficherait.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

/** Longueur du SHA abrégé. Sept, comme partout ailleurs dans le dépôt et chez git. */
const SHORT_SHA = 7;

/** Retire le « v » d'un tag : `git describe` rend « v1.1.1 », semantic-release « 1.1.1 ». */
function bare(value) {
  return (value ?? '').trim().replace(/^v/i, '');
}

/**
 * La règle, et le seul endroit qui la porte.
 *
 * `released` et `exactTag` disent la même chose de deux sources — « ce commit **est**
 * cette version ». `nearestTag` en dit une autre, plus faible mais jamais fausse : « ce
 * commit vient après cette version ».
 *
 * D'où la métadonnée de build `+<sha7>`, au sens semver : elle distingue deux
 * déploiements d'une même version sans prétendre en être une nouvelle. La
 * préproduction la porte toujours — on y redéploie sans cesse le même numéro, et sans
 * elle on ne saurait pas si sa dernière livraison est passée. La production ne la porte
 * que faute de tag exact, c'est-à-dire quand on promeut un commit intermédiaire.
 *
 * @param {{released?: string|null, exactTag?: string|null, nearestTag?: string|null,
 *          sha?: string|null, env?: string}} facts
 * @returns {string} Version nue, sans « v » — les écrans posent le préfixe eux-mêmes.
 */
export function resolveAppVersion({ released, exactTag, nearestTag, sha, env } = {}) {
  const build = (sha ?? '').trim().slice(0, SHORT_SHA);
  const identity = bare(released) || bare(exactTag);

  if (identity) {
    // Sans SHA on ne peut pas qualifier la build : mieux vaut le numéro seul qu'un
    // « 2.2.2+ » bancal.
    return env === 'production' || !build ? identity : `${identity}+${build}`;
  }

  const previous = bare(nearestTag) || '0.0.0';
  return build ? `${previous}+${build}` : previous;
}

// ─── CLI ────────────────────────────────────────────────────────────────────────

/** Lit `--clé valeur`, sans dépendance : le script tourne sur un runner nu. */
function flag(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

/** `git` toléré en échec : pas de tag, historique tronqué, dépôt sans tag du tout. */
function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function main() {
  const env = flag('env', 'staging');
  const released = flag('released');
  const sha = flag('sha', process.env.GITHUB_SHA || git('rev-parse', 'HEAD'));

  const version = resolveAppVersion({
    released,
    exactTag: git('describe', '--tags', '--exact-match', sha),
    nearestTag: git('describe', '--tags', '--abbrev=0', sha),
    sha,
    env
  });

  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `VITE_APP_VERSION=${version}\n`);
  }
  console.log(version);
}

// Ne s'exécute pas à l'import : le test ne veut que la fonction pure.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
