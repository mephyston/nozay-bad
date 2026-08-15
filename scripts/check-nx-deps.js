#!/usr/bin/env node
/**
 * Garde-fou : le graphe Nx doit connaître toutes les dépendances entre projets.
 *
 * Nx déduit le graphe en lisant les imports des fichiers `.ts`/`.js`. Il **ne lit pas**
 * ceux des fichiers `.astro` et `.svelte` — or c'est là que vivent l'admin, la boutique,
 * le site public et les composants de chaque domaine. Le graphe voyait ainsi `storefront`
 * sans aucune dépendance et `admin` avec une seule.
 *
 * Conséquence : `nx affected` ne remontait pas d'une lib vers l'application qui l'affiche.
 * Un commit ne touchant qu'à `@nba/ui` jouait la régression visuelle, la passait au vert,
 * et ne redéployait aucune interface — le correctif restait en dépôt. Le trou existait
 * depuis toujours mais était masqué : tant que `NX_BASE` pointait sur la pointe de `main`,
 * tout était affecté en permanence, donc tout se redéployait quoi qu'il arrive.
 *
 * Le remède est une liste `implicitDependencies` dans les `project.json` concernés. Une
 * liste écrite à la main pourrit dès le premier import ajouté, et pourrit en silence :
 * rien ne casse, on ne s'en aperçoit qu'au déploiement manquant. D'où ce contrôle, qui
 * compare les imports réellement écrits dans chaque projet au graphe que Nx calcule.
 *
 * Usage :
 *   node scripts/check-nx-deps.js
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.astro', '.svelte', '.js', '.mjs']);
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', '.astro', '.nx', 'storybook-static']);

/** Un import réel, et non le nom d'un paquet cité dans un commentaire ou une chaîne. */
const IMPORT_PATTERN = /(?:from|import|require)\s*\(?\s*['"](@nba\/[a-z0-9/-]+)['"]/g;

/**
 * Alias d'import → projet Nx qui le fournit.
 *
 * Un même projet est exposé sous plusieurs alias (`@nba/cms-api`, `@nba/cms-ui`,
 * `@nba/cms/schema`…) : on ne garde que le domaine, et on retrouve le nom du projet tel
 * que Nx le connaît. Lu depuis `tsconfig.base.json` pour rester juste si un alias bouge.
 */
function buildAliasMap(projectNames) {
  const { paths } = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'tsconfig.base.json'), 'utf8')
  ).compilerOptions;

  const byRoot = new Map();
  for (const [name, projectRoot] of projectNames) byRoot.set(projectRoot, name);

  const aliases = new Map();
  for (const [alias, [target]] of Object.entries(paths)) {
    // `libs/domains/cms/shared/ui.ts` → on cherche la racine de projet la plus longue
    // qui le préfixe, `libs/domains/cms`.
    let best = null;
    for (const root of byRoot.keys()) {
      if (target.startsWith(`${root}/`) && (best === null || root.length > best.length)) best = root;
    }
    if (best !== null) aliases.set(alias, byRoot.get(best));
  }
  return aliases;
}

function sourceFilesOf(dir, found = []) {
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

// `nx graph` écrit le graphe résolu — dépendances déduites ET implicites confondues,
// donc exactement ce que `nx affected` utilisera.
const graphFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nx-deps-')), 'graph.json');
try {
  execFileSync('npx', ['nx', 'graph', '--file', graphFile], { cwd: ROOT_DIR, stdio: 'pipe' });
  var graph = JSON.parse(fs.readFileSync(graphFile, 'utf8')).graph;
} finally {
  fs.rmSync(path.dirname(graphFile), { recursive: true, force: true });
}

const projectRoots = Object.entries(graph.nodes).map(([name, node]) => [name, node.data.root]);
const aliases = buildAliasMap(projectRoots);

const gaps = [];
for (const [project, root] of projectRoots) {
  const declared = new Set((graph.dependencies[project] ?? []).map((d) => d.target));
  const imported = new Set();

  for (const file of sourceFilesOf(path.join(ROOT_DIR, root))) {
    const content = fs.readFileSync(file, 'utf8');
    for (const [, specifier] of content.matchAll(IMPORT_PATTERN)) {
      // Le premier segment après `@nba/` suffit : `@nba/cms/schema` et `@nba/cms-ui`
      // désignent le même projet.
      const target = aliases.get(specifier) ?? aliases.get(`@nba/${specifier.split('/')[1]}`);
      if (target && target !== project) imported.add(target);
    }
  }

  const missing = [...imported].filter((target) => !declared.has(target)).sort();
  if (missing.length > 0) gaps.push({ project, root, missing });
}

if (gaps.length > 0) {
  console.error('\n[nx-deps] Dépendances importées mais absentes du graphe Nx :\n');
  for (const { project, root, missing } of gaps) {
    console.error(`  ✗ ${project} (${root}/project.json)`);
    for (const target of missing) console.error(`      ${target}`);
  }
  console.error(
    "\nNx ne lit pas les imports des fichiers .astro et .svelte : ces dépendances lui sont\n" +
      'invisibles, donc `nx affected` ne remontera pas jusqu\'à ce projet et il ne sera ni\n' +
      'testé ni redéployé quand la lib change.\n\n' +
      'Ajoutez-les à `"implicitDependencies"` dans le project.json indiqué.\n'
  );
  process.exit(1);
}

console.log(
  `[nx-deps] OK — ${projectRoots.length} projets vérifiés, le graphe couvre tous les imports @nba/*.`
);
