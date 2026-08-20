#!/usr/bin/env node
/**
 * Régénère `CHANGELOG.md` à partir des Releases GitHub, juste avant le build de l'admin.
 *
 * Pourquoi. `apps/admin/src/pages/changelog.astro` importe `CHANGELOG.md` et le rend
 * dans l'écran « Nouveautés ». Ce fichier était tenu à jour par `@semantic-release/git`,
 * qui recommittait `package.json` et `CHANGELOG.md` sur `main` après chaque version —
 * d'où un `main` local systématiquement en retard d'un commit, et un rebase permanent.
 *
 * En retirant ce plugin, on a supprimé le rebase mais aussi la source du fichier. Les
 * notes de version vivent désormais dans les **Releases GitHub**, générées par
 * `@semantic-release/release-notes-generator`. Ce script les relit et reconstitue le
 * fichier au moment du build : la source unique reste les Releases, l'écran reste vivant,
 * et rien n'est jamais recommitté.
 *
 * Le fichier reste versionné dans le dépôt : il sert de repli hors CI (développement
 * local, où aucun jeton n'est disponible) et évite que l'import d'Astro n'échoue.
 *
 * `docs/changelog-archive.md` porte l'historique antérieur à l'adoption du tronc unique.
 * Les versions v1.0.0 à v1.0.2 ont un tag mais aucune Release GitHub — le plugin qui les
 * crée n'existait pas encore — donc l'API ne les renvoie pas. L'archive est concaténée
 * sous les versions générées pour que l'écran « Nouveautés » ne perde rien.
 *
 * Usage :
 *   GITHUB_TOKEN=... node scripts/generate-changelog.mjs [--repo owner/name]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT_DIR, 'CHANGELOG.md');

const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const repoFlag = process.argv.indexOf('--repo');
const REPO =
  repoFlag !== -1 && process.argv[repoFlag + 1]?.includes('/')
    ? process.argv[repoFlag + 1]
    : (process.env.GITHUB_REPOSITORY ?? 'mephyston/nozay-bad');

/**
 * Sans jeton, on ne touche pas au fichier : c'est le cas du développement local, où le
 * contenu déjà versionné fait parfaitement l'affaire. Échouer ici casserait `nx build`
 * sur le poste de travail sans rien apporter.
 */
if (!TOKEN) {
  console.log('[changelog] aucun GITHUB_TOKEN — le fichier versionné est conservé.');
  process.exit(0);
}

const releases = [];
for (let page = 1; page <= 10; page += 1) {
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`,
    {
      headers: {
        authorization: `Bearer ${TOKEN}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'nozay-bad-changelog'
      }
    }
  );

  if (!response.ok) {
    console.error(
      `[changelog] GitHub a répondu ${response.status} — le fichier versionné est conservé.`
    );
    process.exit(0);
  }

  const batch = await response.json();
  releases.push(...batch);
  if (batch.length < 100) break;
}

if (releases.length === 0) {
  console.log('[changelog] aucune Release publiée — le fichier versionné est conservé.');
  process.exit(0);
}

const body = releases
  .filter((release) => !release.draft)
  .map((release) => {
    const title = release.name || release.tag_name;
    const date = release.published_at?.slice(0, 10) ?? '';
    const notes = (release.body ?? '').trim() || '_Aucune note pour cette version._';
    // Les notes de semantic-release commencent par un titre de niveau 1 ou 2 reprenant
    // la version : on le retire pour ne pas doubler celui qu'on écrit juste au-dessus.
    const cleaned = notes.replace(/^#{1,2} .*\n+/, '');
    return `## ${title}${date ? ` — ${date}` : ''}\n\n${cleaned}`;
  })
  .join('\n\n');

const ARCHIVE = path.join(ROOT_DIR, 'docs', 'changelog-archive.md');
const archive = fs.existsSync(ARCHIVE) ? fs.readFileSync(ARCHIVE, 'utf8').trim() : '';

fs.writeFileSync(
  OUTPUT,
  `<!-- Généré par scripts/generate-changelog.mjs depuis les Releases GitHub. Ne pas éditer à la main. -->\n\n# Nouveautés\n\n${body}\n` +
    (archive ? `\n${archive}\n` : '')
);

console.log(`[changelog] ${releases.length} version(s) écrites dans CHANGELOG.md.`);
