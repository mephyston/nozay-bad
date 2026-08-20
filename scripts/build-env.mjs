#!/usr/bin/env node
/**
 * Résout les variables de build d'une application pour un environnement donné, puis
 * vérifie après coup que le bundle produit ne contient pas les valeurs de l'autre.
 *
 * Pourquoi. Astro/Vite **inline** ces valeurs dans le bundle (`vite.define` dans les
 * `astro.config.mjs`) : elles doivent être posées avant `astro build`, donc elles ne
 * peuvent pas venir du `wrangler.json`. Elles vivaient jusqu'ici en dur dans le YAML de
 * `deploy.yml`, dupliquées par application. Avec un workflow de promotion en plus, cette
 * duplication devenait le premier risque du dispositif : deux blocs YAML qui divergent,
 * et un jour une production construite avec les URL de préproduction.
 *
 * Le parti pris est de **dériver** plutôt que de recopier. `PUBLIC_VAPID_PUBLIC_KEY` en
 * particulier est lue dans `apps/api/wrangler.json` : le commentaire de `deploy.yml`
 * avertissait que sa valeur « doit rester identique au VAPID_PUBLIC_KEY du Worker
 * nba-api correspondant, sinon les abonnements sont rejetés ». Une valeur unique lue à
 * un seul endroit transforme cet avertissement en invariant.
 *
 * Le mode `--verify` est le garde-fou anti-promotion-contaminée : il relit `dist/` et
 * échoue si un marqueur de l'autre environnement y figure. C'est nécessaire parce que
 * `astro.config.mjs` fait `process.env.PUBLIC_APP_ENV || 'production'` — un oubli côté
 * préproduction produit silencieusement un bundle de production.
 *
 * Usage :
 *   node scripts/build-env.mjs --app storefront --env production        # KEY=value
 *   node scripts/build-env.mjs --app storefront --env production --verify
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const APPS = ['storefront', 'website', 'admin'];
const ENVS = ['staging', 'production'];

/**
 * Clé publique du widget Turnstile. Un seul widget couvre les deux environnements : ses
 * hostnames autorisés sont `my.nozaybad.fr` et `staging-my.nozaybad.fr`. Publique par
 * nature (elle est rendue dans le HTML) ; le secret correspondant est posé par
 * `wrangler secret put TURNSTILE_SECRET_KEY`.
 */
const TURNSTILE_SITE_KEY = '0x4AAAAAAD1TY7I_ql47XOjI';

/** Domaines inlinés par les `astro.config.mjs`, utilisés comme marqueurs de vérification. */
const HOSTS = {
  staging: ['staging-my.nozaybad.fr', 'staging-www.nozaybad.fr'],
  production: ['my.nozaybad.fr', 'prod-www.nozaybad.fr']
};

function fail(message) {
  console.error(`\n[build-env] ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { app: null, env: null, verify: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--verify') args.verify = true;
    else if (arg === '--app') args.app = argv[++i];
    else if (arg === '--env') args.env = argv[++i];
    else fail(`argument inconnu : ${arg}`);
  }
  return args;
}

/**
 * Clé VAPID publique du Worker API de l'environnement visé. Source unique : le bundle
 * du storefront et le Worker qui signe les notifications doivent porter la même.
 */
function vapidPublicKey(env) {
  const api = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'apps', 'api', 'wrangler.json'), 'utf8')
  );
  const vars = env === 'production' ? api.vars : api.env?.[env]?.vars;
  const key = vars?.VAPID_PUBLIC_KEY;
  if (!key) {
    fail(
      `VAPID_PUBLIC_KEY introuvable pour « ${env} » dans apps/api/wrangler.json.\n` +
        `Sans elle, pushManager.subscribe() serait construit avec une clé vide et tous ` +
        `les abonnements seraient rejetés.`
    );
  }
  return key;
}

function resolve(app, env) {
  const vars = { PUBLIC_APP_ENV: env };
  if (app === 'storefront') {
    vars.PUBLIC_VAPID_PUBLIC_KEY = vapidPublicKey(env);
    vars.PUBLIC_TURNSTILE_SITE_KEY = TURNSTILE_SITE_KEY;
  }
  return vars;
}

/**
 * Relit le bundle et échoue si un marqueur de l'autre environnement s'y trouve. La
 * présence d'un hostname de préproduction dans un bundle de production prouve
 * mécaniquement que le build a tourné avec le mauvais PUBLIC_APP_ENV.
 */
function verify(app, env) {
  const distDir = path.join(ROOT_DIR, 'apps', app, 'dist');
  if (!fs.existsSync(distDir)) {
    fail(`dist/ absent pour ${app} : lancez « npx nx build ${app} » avant --verify.`);
  }

  const other = env === 'production' ? 'staging' : 'production';
  const forbidden = [...HOSTS[other]];
  if (app === 'storefront') forbidden.push(vapidPublicKey(other));

  // Les hostnames de production sont des sous-chaînes de ceux de préproduction
  // (`my.nozaybad.fr` ⊂ `staging-my.nozaybad.fr`) : on ne peut pas chercher naïvement
  // un marqueur de production dans un bundle de préproduction.
  const isSubstringOfOwnHosts = (needle) =>
    HOSTS[env].some((host) => host.includes(needle) && host !== needle);

  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      // `wrangler.json` est la configuration générée par l'adaptateur, pas le bundle :
      // elle porte encore l'environnement par défaut aplati à ce stade, et c'est
      // patch-wrangler.mjs — exécuté juste après — qui la corrige puis l'asserte.
      // L'inclure ici produisait un faux positif systématique sur le site public.
      if (entry.name === 'wrangler.json') continue;
      if (!/\.(m?js|html|json|webmanifest)$/.test(entry.name)) continue;
      const content = fs.readFileSync(full, 'utf8');
      for (const needle of forbidden) {
        if (isSubstringOfOwnHosts(needle)) continue;
        if (content.includes(needle)) {
          offenders.push(`${path.relative(ROOT_DIR, full)} → « ${needle} »`);
        }
      }
    }
  };
  walk(distDir);

  if (offenders.length > 0) {
    fail(
      `le bundle ${app}/${env} contient des marqueurs de « ${other} » :\n` +
        offenders.slice(0, 10).map((o) => `  - ${o}`).join('\n') +
        (offenders.length > 10 ? `\n  … et ${offenders.length - 10} autres` : '') +
        `\n\nLe build a très probablement tourné avec PUBLIC_APP_ENV=${other}.`
    );
  }
  console.log(`[build-env] --verify : bundle ${app}/${env} sans marqueur de ${other}.`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!APPS.includes(args.app)) fail(`--app doit valoir l'un de : ${APPS.join(', ')}.`);
  if (!ENVS.includes(args.env)) fail(`--env doit valoir l'un de : ${ENVS.join(', ')}.`);

  if (args.verify) {
    verify(args.app, args.env);
    return;
  }

  // Sortie destinée à `>> "$GITHUB_ENV"`.
  for (const [key, value] of Object.entries(resolve(args.app, args.env))) {
    console.log(`${key}=${value}`);
  }
}

main();
