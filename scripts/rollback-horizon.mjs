#!/usr/bin/env node
/**
 * Calcule jusqu'où un retour arrière du code reste sûr vis-à-vis du schéma D1.
 *
 * Pourquoi. `wrangler rollback` ne revient que sur le code du Worker : **la base reste
 * en avant**. Tant que les migrations sont additives, l'ancien code ignore simplement
 * les nouvelles colonnes et tout se passe bien. Mais une migration destructive — un
 * `DROP COLUMN`, un `DROP TABLE`, un renommage — supprime ce que l'ancien code
 * interroge, et le rollback produit des 500.
 *
 * Le motif *expand/contract* ne supprime pas ce risque, il en **borne la portée** :
 * revenir d'une version passe, revenir de deux peut franchir un `contract`. Cette limite
 * était jusqu'ici invisible — rien n'avertissait avant de basculer.
 *
 * Ce script répond donc à une seule question : « quelle est la version la plus ancienne
 * vers laquelle je peux revenir sans casser le schéma ? » Il cherche la dernière
 * migration destructive, retrouve le tag qui l'a introduite, et en déduit l'horizon.
 *
 * Il ne remplace pas le jugement : au-delà de l'horizon, la bonne manœuvre est le *fix
 * forward* (une migration de plus, une version de plus), pas la reconstruction d'un état
 * passé — voir CONTRIBUTING.md §8.6.
 *
 * Usage :
 *   node scripts/rollback-horizon.mjs            # texte lisible
 *   node scripts/rollback-horizon.mjs --json     # sortie exploitable en CI
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'libs', 'shared', 'db', 'migrations');

const AS_JSON = process.argv.includes('--json');

/**
 * Opérations qui retirent au schéma ce que du code plus ancien pourrait interroger.
 * `ADD COLUMN`, `CREATE TABLE` et `CREATE INDEX` en sont volontairement absents : ils
 * n'empêchent jamais un retour arrière.
 */
const DESTRUCTIVE = [
  { pattern: /\bDROP\s+TABLE\b/i, label: 'DROP TABLE' },
  { pattern: /\bDROP\s+COLUMN\b/i, label: 'DROP COLUMN' },
  { pattern: /\bRENAME\s+TO\b/i, label: 'RENAME TO' },
  { pattern: /\bRENAME\s+COLUMN\b/i, label: 'RENAME COLUMN' },
  { pattern: /\bDROP\s+INDEX\b/i, label: 'DROP INDEX' }
];

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT_DIR, stdio: 'pipe' }).toString().trim();
}

/** Migrations livrées, dans l'ordre d'application. */
const migrations = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const destructive = [];
for (const file of migrations) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  const operations = DESTRUCTIVE.filter(({ pattern }) => pattern.test(sql)).map((d) => d.label);
  if (operations.length > 0) destructive.push({ file, operations });
}

if (destructive.length === 0) {
  const message =
    'Aucune migration destructive : le retour arrière du code est sûr sur toute la rétention (100 versions).';
  console.log(AS_JSON ? JSON.stringify({ safe: true, horizon: null, message }) : `✅ ${message}`);
  process.exit(0);
}

const last = destructive[destructive.length - 1];

/** Commit qui a ajouté cette migration, puis premier tag qui le contient. */
let commit = null;
let introducedBy = null;
let horizon = null;
try {
  commit = git('log', '--diff-filter=A', '--format=%H', '-1', '--', `${MIGRATIONS_DIR}/${last.file}`);
  if (commit) {
    // `--contains` liste les tags descendants ; le premier par date est celui qui l'a
    // publiée. C'est la version à partir de laquelle le schéma amputé existe.
    const tags = git('tag', '--contains', commit, '--sort=creatordate').split('\n').filter(Boolean);
    introducedBy = tags[0] ?? null;
    // L'horizon est la version qui a publié le contract, **incluse** : à partir d'elle,
    // le code n'interroge plus ce que la migration supprime. C'est la version d'avant
    // qui est dangereuse — d'où l'attention portée à ce décalage d'un cran.
    horizon = introducedBy;
  }
} catch {
  // Dépôt sans historique (archive, worktree partiel) : on dégrade sans échouer.
}

const result = {
  safe: false,
  lastDestructiveMigration: last.file,
  operations: last.operations,
  commit,
  introducedBy,
  horizon,
  totalDestructive: destructive.length
};

if (AS_JSON) {
  console.log(JSON.stringify(result));
  process.exit(0);
}

console.log('⚠️  Horizon de retour arrière');
console.log('');
console.log(`   Dernière migration destructive : ${last.file}`);
console.log(`   Opérations                     : ${last.operations.join(', ')}`);
if (introducedBy) console.log(`   Publiée par                    : ${introducedBy}`);
if (horizon) {
  console.log(`   Retour arrière sûr jusqu'à     : ${horizon} (incluse)`);
  console.log('');
  console.log(`   Revenir avant ${horizon} ressusciterait du code qui interroge un schéma`);
  console.log(`   que ${last.file} a amputé. Préférez alors un correctif en avant`);
  console.log(`   (nouvelle migration, nouvelle version) — cf. CONTRIBUTING.md §8.6.`);
} else {
  console.log(`   Retour arrière sûr jusqu'à     : (aucun tag trouvé pour ce commit)`);
}
console.log('');
console.log(`   ${destructive.length} migration(s) destructive(s) au total :`);
for (const d of destructive) console.log(`     - ${d.file} (${d.operations.join(', ')})`);
