#!/usr/bin/env node
/**
 * Garde-fou : chaque table d'alias doit couvrir ce que ses fichiers importent.
 *
 * Un alias `@nba/*` n'est pas résolu à un seul endroit. `tsconfig.base.json` sert la
 * vérification de types ; chaque application Astro tient **sa propre** liste de `paths`,
 * parce qu'elle étend la configuration d'Astro et non la nôtre ; et chaque configuration
 * de test rejoue la sienne, Vite ne lisant pas les `paths` de TypeScript. Un même import
 * doit donc être déclaré dans plusieurs tables, et rien ne le vérifiait.
 *
 * L'oubli ne se voit qu'au moment où l'on exécute la bonne chose : la build d'une
 * application, ou la suite de tests d'un projet précis. Il est arrivé deux fois pendant
 * le développement du jeu libre — `@nba/schedules-ui` absent du storefront, puis
 * `@nba/schedules/schema` absent des tests de l'API — et à chaque fois après coup, alors
 * que le reste était vert.
 *
 * Le contrôle est volontairement limité aux imports **directs** : suivre la résolution
 * transitive demanderait de rejouer le graphe de modules de Vite, pour un gain nul sur
 * les cas réels.
 *
 * Usage :
 *   node scripts/check-aliases.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.astro', '.svelte', '.js', '.mjs']);
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  '.astro',
  '.nx',
  '.wrangler',
  'storybook-static'
]);

/** Un import réel, et non un nom de paquet cité dans un commentaire. */
const IMPORT_PATTERN = /(?:from|import|require)\s*\(?\s*['"](@nba\/[a-z0-9/-]+)['"]/g;
/** Une clé de table d'alias : `'@nba/x': path.resolve(...)` ou `"@nba/x": ["..."]`. */
const ALIAS_KEY_PATTERN = /['"](@nba\/[a-z0-9/-]+)['"]\s*:/g;

function sourceFilesOf(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.storybook') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) sourceFilesOf(full, found);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      found.push(full);
    }
  }
  return found;
}

/** Les alias importés dans une arborescence, avec un fichier témoin pour le message. */
function importedAliases(dirs, { testsOnly = false } = {}) {
  const witnesses = new Map();
  for (const dir of dirs) {
    for (const file of sourceFilesOf(path.join(ROOT_DIR, dir))) {
      if (testsOnly && !file.endsWith('.test.ts')) continue;
      const content = fs.readFileSync(file, 'utf8');
      for (const [, specifier] of content.matchAll(IMPORT_PATTERN)) {
        if (!witnesses.has(specifier)) witnesses.set(specifier, path.relative(ROOT_DIR, file));
      }
    }
  }
  return witnesses;
}

/** Les alias déclarés par une table, quel que soit son format (JSON ou TypeScript). */
function declaredAliases(file) {
  const content = fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
  return new Set([...content.matchAll(ALIAS_KEY_PATTERN)].map(([, alias]) => alias));
}

/**
 * Ce que chaque table doit couvrir.
 *
 * Les applications Astro tiennent leurs `paths` **et** leur table de test : les deux
 * gouvernent les mêmes fichiers, et se sont déjà retrouvées désaccordées. `apps/api`
 * hérite des `paths` de la base, seule sa table de test est à vérifier.
 */
const TABLES = [
  { file: 'tsconfig.base.json', scopes: ['apps', 'libs'], why: 'vérification de types' },
  { file: 'vitest.aliases.ts', scopes: ['libs'], why: 'tests des domaines' },
  { file: 'apps/api/vitest.config.ts', scopes: ['apps/api'], why: "tests de l'API" },
  { file: 'apps/admin/tsconfig.json', scopes: ['apps/admin'], why: "build de l'admin" },
  { file: 'apps/storefront/tsconfig.json', scopes: ['apps/storefront'], why: 'build du storefront' },
  { file: 'apps/website/tsconfig.json', scopes: ['apps/website'], why: 'build du site public' },
  // Les applications Astro ne sont vérifiées que sur leurs **fichiers de test**.
  // Vitest n'exécute jamais une page `.astro`, et exiger que sa table couvre ce que les
  // pages importent produirait une dizaine de faux positifs par application. Un import
  // direct depuis un test, en revanche, est exactement ce qui a manqué deux fois.
  { file: 'apps/admin/vitest.config.ts', scopes: ['apps/admin'], testsOnly: true, why: "tests de l'admin" },
  { file: 'apps/storefront/vitest.config.ts', scopes: ['apps/storefront'], testsOnly: true, why: 'tests du storefront' },
  { file: 'apps/website/vitest.config.ts', scopes: ['apps/website'], testsOnly: true, why: 'tests du site public' }
];

const gaps = [];
for (const { file, scopes, why, testsOnly } of TABLES) {
  if (!fs.existsSync(path.join(ROOT_DIR, file))) continue;
  const declared = declaredAliases(file);
  const missing = [...importedAliases(scopes, { testsOnly })]
    .filter(([alias]) => !declared.has(alias))
    .sort(([a], [b]) => a.localeCompare(b));
  if (missing.length > 0) gaps.push({ file, why, missing });
}

if (gaps.length > 0) {
  console.error('\n[aliases] Alias importés mais absents de la table qui doit les résoudre :\n');
  for (const { file, why, missing } of gaps) {
    console.error(`  ✗ ${file}  (${why})`);
    for (const [alias, witness] of missing) console.error(`      ${alias}   — ${witness}`);
  }
  console.error(
    "\nUn alias `@nba/*` se déclare dans PLUSIEURS tables : `tsconfig.base.json` pour les\n" +
      "types, les `paths` de chaque application Astro pour sa build, et la configuration de\n" +
      "test de chaque projet pour Vite, qui ne lit pas les `paths` de TypeScript.\n\n" +
      "Ajoutez l'alias manquant dans le fichier indiqué.\n"
  );
  process.exit(1);
}

console.log(`[aliases] OK — ${TABLES.length} tables vérifiées, chacune couvre ses imports @nba/*.`);
