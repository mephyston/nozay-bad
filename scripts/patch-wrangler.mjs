#!/usr/bin/env node
/**
 * Applique la configuration d'un environnement sur le `wrangler.json` généré par
 * l'adaptateur Astro, puis vérifie qu'elle est cohérente avant déploiement.
 *
 * Pourquoi ce script existe. Les trois applications Astro ne se déploient pas depuis
 * leur `apps/<app>/wrangler.json`, mais depuis `apps/<app>/dist/server/wrangler.json`
 * que produit `@astrojs/cloudflare` — `apps/<app>/.wrangler/deploy/config.json` y
 * *redirige* wrangler. Or cette configuration générée **aplatit l'environnement par
 * défaut** : elle conserve `definedEnvironments: ["staging"]` mais perd le bloc `env`.
 * `wrangler deploy --env staging` n'a donc aucun effet sur ces trois applications, et
 * la préproduction hériterait des ressources de production. Seul `apps/api`, dont la
 * configuration n'est pas redirigée, garde `--env staging` natif.
 *
 * Ce qu'il remplace. Trois blocs `node -e` quasi identiques dans `deploy.yml`, où les
 * identifiants KV, les compartiments R2 et les variables étaient recopiés à la main —
 * en doublon des blocs `env.staging` des `wrangler.json`, qui n'étaient donc jamais lus.
 * Les deux copies avaient d'ailleurs divergé (`EMAIL_MODE` valait `dry-run` dans le
 * fichier et `allowlist` dans la CI). Les blocs `env.<nom>` redeviennent ici la source
 * unique : ce qui est déployé est ce qui est écrit dans le dépôt.
 *
 * Sémantique. Identique à celle de wrangler : un bloc `env.<nom>` **remplace** les clés
 * qu'il déclare, il ne les fusionne pas. `vars` en particulier n'est pas héritée — c'est
 * pourquoi les blocs `env.staging` répètent `EMAIL_FROM` et `SITE_URL`.
 *
 * Usage :
 *   node scripts/patch-wrangler.mjs --app storefront --env staging
 *   node scripts/patch-wrangler.mjs --app website --env production --dry-run
 *   node scripts/patch-wrangler.mjs --check
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

/** Applications déployées via la configuration redirigée de l'adaptateur Astro. */
const APPS = ['storefront', 'website', 'admin'];
const ENVS = ['staging', 'production'];

/**
 * Clés qu'un bloc `env.<nom>` a le droit de redéfinir. Toute autre clé rencontrée
 * lève : le jour où un binding Queues ou Durable Object est ajouté à un bloc, on veut
 * que la CI le signale plutôt que de le perdre en silence au déploiement.
 */
const APPLICABLE_KEYS = new Set([
  'name',
  'vars',
  'services',
  'kv_namespaces',
  'r2_buckets',
  'd1_databases',
  'queues',
  'routes',
  'route',
  'triggers',
  'workers_dev'
]);

/**
 * Clés admises dans un bloc mais volontairement ignorées : elles proviennent déjà de la
 * configuration générée, qui fait autorité sur le bundle lui-même.
 */
const IGNORED_KEYS = new Set([
  'main',
  'compatibility_date',
  'compatibility_flags',
  'observability',
  'assets',
  'account_id'
]);

function fail(message) {
  console.error(`\n[patch-wrangler] ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { app: null, env: null, check: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--app') args.app = argv[++i];
    else if (arg === '--env') args.env = argv[++i];
    else fail(`argument inconnu : ${arg}`);
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sourcePath(app) {
  return path.join(ROOT_DIR, 'apps', app, 'wrangler.json');
}

function generatedPath(app) {
  return path.join(ROOT_DIR, 'apps', app, 'dist', 'server', 'wrangler.json');
}

/**
 * Nettoyages nécessaires quel que soit l'environnement, sur ce que l'adaptateur injecte.
 */
function applyUniversalCleanups(cfg) {
  // L'adaptateur injecte une KV `SESSION` sans `id` : telle quelle, elle fait échouer
  // le déploiement. Aucune des trois applications n'utilise les sessions Astro.
  cfg.kv_namespaces = (cfg.kv_namespaces ?? []).filter((kv) => kv.id);
  // `previews` est laissé tel quel : les blocs `node -e` qu'on remplace n'y touchaient
  // pas et les déploiements passent. On ne dévie pas du comportement éprouvé.

  // Le binding Images n'appartient qu'à l'API ; l'adaptateur le propage à tort.
  delete cfg.images;

  // Désactive l'URL *.workers.dev : seul le domaine personnalisé reste joignable.
  cfg.workers_dev = false;
}

/**
 * Applique un bloc d'environnement avec les sémantiques de wrangler (remplacement).
 */
function applyEnvBlock(cfg, block, { app, env }) {
  for (const [key, value] of Object.entries(block)) {
    if (key === 'env') continue;
    if (IGNORED_KEYS.has(key)) continue;
    if (!APPLICABLE_KEYS.has(key)) {
      fail(
        `clé non prise en charge dans env.${env} de ${app} : « ${key} ».\n` +
          `Ajoutez-la à APPLICABLE_KEYS si elle doit être déployée, ou à IGNORED_KEYS ` +
          `si elle doit provenir de la configuration générée.`
      );
    }
    cfg[key] = structuredClone(value);
  }
}

/**
 * Garde-fous sur la configuration résolue. Un déploiement qui pointe la mauvaise base
 * ou le mauvais compartiment ne se voit pas dans les logs : il se voit en production.
 */
function assertResolved(cfg, { app, env }) {
  if (cfg.workers_dev !== false) fail(`${app}/${env} : workers_dev doit rester false.`);
  if (!cfg.name) fail(`${app}/${env} : la configuration résolue n'a pas de nom de Worker.`);
  if (!cfg.services?.length) {
    fail(`${app}/${env} : aucun service binding — les trois applications parlent à l'API.`);
  }
  for (const kv of cfg.kv_namespaces ?? []) {
    if (!kv.id) fail(`${app}/${env} : KV « ${kv.binding} » sans identifiant.`);
  }

  if (env === 'staging') {
    const suffixed = (value) => typeof value === 'string' && value.endsWith('-staging');
    if (!suffixed(cfg.name)) fail(`staging : nom de Worker sans suffixe -staging (${cfg.name}).`);
    for (const service of cfg.services ?? []) {
      if (!suffixed(service.service)) {
        fail(`staging : service binding vers la production (${service.service}).`);
      }
    }
    for (const bucket of cfg.r2_buckets ?? []) {
      if (!suffixed(bucket.bucket_name)) {
        fail(`staging : compartiment R2 de production (${bucket.bucket_name}).`);
      }
    }
    for (const db of cfg.d1_databases ?? []) {
      if (!suffixed(db.database_name)) {
        fail(`staging : base D1 de production (${db.database_name}).`);
      }
    }
    // Anti-envoi aux adhérents : la configuration générée aplatit EMAIL_MODE=live.
    if (cfg.vars?.EMAIL_MODE === 'live') {
      fail(`staging : EMAIL_MODE=live enverrait de vrais courriels aux adhérents.`);
    }
  }

  if (env === 'production') {
    // Contrôle massue, volontairement plus large que nécessaire : aucune trace de
    // préproduction ne doit subsister dans la surface de configuration déployée.
    const surface = JSON.stringify({
      name: cfg.name,
      services: cfg.services,
      kv_namespaces: cfg.kv_namespaces,
      r2_buckets: cfg.r2_buckets,
      d1_databases: cfg.d1_databases,
      vars: cfg.vars
    });
    if (/staging/i.test(surface)) {
      fail(`production : valeur de préproduction dans la configuration résolue.\n${surface}`);
    }
  }
}

function summarize(cfg) {
  return {
    name: cfg.name,
    workers_dev: cfg.workers_dev,
    services: cfg.services,
    kv_namespaces: cfg.kv_namespaces,
    r2_buckets: cfg.r2_buckets,
    d1_databases: cfg.d1_databases,
    vars: cfg.vars
  };
}

/**
 * Vérifie que chaque bloc `env.staging` couvre exactement les mêmes clés que la racine.
 * C'est le contrôle qui aurait évité l'incident du compartiment R2 : la préproduction
 * héritait de celui de production — vide — d'où des médias en 404.
 */
function runCheck() {
  let failures = 0;

  for (const app of APPS) {
    const source = readJson(sourcePath(app));
    const staging = source.env?.staging;
    if (!staging) {
      console.error(`✗ ${app} : bloc env.staging absent de wrangler.json.`);
      failures += 1;
      continue;
    }

    const compare = (label, rootValue, envValue, keyOf) => {
      const rootKeys = (rootValue ?? []).map(keyOf).sort();
      const envKeys = (envValue ?? []).map(keyOf).sort();
      if (JSON.stringify(rootKeys) !== JSON.stringify(envKeys)) {
        console.error(
          `✗ ${app} : ${label} — racine [${rootKeys}] ≠ env.staging [${envKeys}].`
        );
        failures += 1;
      }
    };

    compare('services', source.services, staging.services, (s) => s.binding);
    compare('kv_namespaces', source.kv_namespaces, staging.kv_namespaces, (kv) => kv.binding);
    compare('r2_buckets', source.r2_buckets, staging.r2_buckets, (r) => r.binding);
    compare('d1_databases', source.d1_databases, staging.d1_databases, (d) => d.binding);

    const rootVars = Object.keys(source.vars ?? {}).sort();
    const envVars = Object.keys(staging.vars ?? {}).sort();
    if (JSON.stringify(rootVars) !== JSON.stringify(envVars)) {
      console.error(`✗ ${app} : vars — racine [${rootVars}] ≠ env.staging [${envVars}].`);
      failures += 1;
    }
  }

  if (failures > 0) {
    console.error(
      `\n[patch-wrangler] ${failures} écart(s) entre la racine et env.staging.\n` +
        `Une ressource déclarée d'un seul côté est une ressource de production utilisée ` +
        `en préproduction, ou l'inverse.\n`
    );
    process.exit(1);
  }
  console.log('[patch-wrangler] --check : racine et env.staging déclarent les mêmes clés.');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.check) {
    runCheck();
    return;
  }

  if (!APPS.includes(args.app)) fail(`--app doit valoir l'un de : ${APPS.join(', ')}.`);
  if (!ENVS.includes(args.env)) fail(`--env doit valoir l'un de : ${ENVS.join(', ')}.`);

  const { app, env } = args;
  const target = generatedPath(app);
  if (!fs.existsSync(target)) {
    fail(`configuration générée absente : ${path.relative(ROOT_DIR, target)}.\n` +
      `Lancez « npx nx build ${app} » avant ce script.`);
  }

  const source = readJson(sourcePath(app));
  const cfg = readJson(target);

  applyUniversalCleanups(cfg);

  // En production, la configuration générée porte déjà l'environnement par défaut
  // aplati : il n'y a rien à appliquer par-dessus.
  if (env !== 'production') {
    const block = source.env?.[env];
    if (!block) {
      fail(`bloc env.${env} absent de apps/${app}/wrangler.json — rien à appliquer. ` +
        `Sans cette erreur, le Worker serait déployé avec la configuration de production.`);
    }
    applyEnvBlock(cfg, block, { app, env });
  }

  assertResolved(cfg, { app, env });

  console.log(`[patch-wrangler] ${app} → ${env}`);
  console.log(JSON.stringify(summarize(cfg), null, 2));

  if (args.dryRun) {
    console.log('[patch-wrangler] --dry-run : configuration non écrite.');
    return;
  }

  fs.writeFileSync(target, JSON.stringify(cfg, null, 2));
}

main();
