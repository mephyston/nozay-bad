#!/usr/bin/env node
/**
 * Garde-fou : les migrations D1 sont **append-only**.
 *
 * `wrangler d1 migrations apply` suit les migrations déjà jouées **par nom de
 * fichier** (table `d1_migrations`). Renommer ou renuméroter un fichier déjà
 * appliqué le fait donc rejouer intégralement sur les bases existantes.
 *
 * C'est ce qui est arrivé le 29/07/2026 : le commit 2fc9dfb a interverti
 * `0001_seed_reference_data.sql` et `0002_add_active_to_categories.sql`. Le seed a
 * été rejoué en staging et a dupliqué toutes les catégories comptables et les
 * catégories produits (`INSERT OR IGNORE` ne filtrait rien faute d'index unique).
 *
 * Le manifeste `migrations.lock.json` fige le nom et l'empreinte de chaque
 * migration livrée. Toute migration renommée, supprimée ou modifiée fait échouer la
 * CI. Pour corriger une migration déjà livrée, on en ajoute une nouvelle.
 *
 * Usage :
 *   node scripts/check-migrations-append-only.js            # vérifie
 *   node scripts/check-migrations-append-only.js --update   # enregistre les ajouts
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'libs/shared/db/migrations');
const LOCK_FILE = path.join(MIGRATIONS_DIR, 'migrations.lock.json');
const UPDATE = process.argv.includes('--update');

function hashOf(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
}

const current = Object.fromEntries(
  fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => [f, hashOf(path.join(MIGRATIONS_DIR, f))])
);

if (UPDATE) {
  const previous = fs.existsSync(LOCK_FILE) ? JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')).migrations : {};
  // On ne réécrit jamais une empreinte déjà figée : seuls les ajouts sont repris.
  const merged = { ...current, ...previous };
  const kept = Object.fromEntries(Object.keys(merged).sort().map((name) => [name, merged[name]]));
  fs.writeFileSync(
    LOCK_FILE,
    JSON.stringify(
      { comment: 'Migrations D1 livrées : append-only. Voir scripts/check-migrations-append-only.js', migrations: kept },
      null,
      2
    ) + '\n'
  );
  const added = Object.keys(current).filter((f) => !(f in previous));
  console.log(`[migrations] Manifeste mis à jour (${Object.keys(kept).length} migrations, ${added.length} ajout(s)).`);
  process.exit(0);
}

if (!fs.existsSync(LOCK_FILE)) {
  console.error(
    `[migrations] Manifeste absent (${path.relative(ROOT_DIR, LOCK_FILE)}).\n` +
      'Générez-le avec : npm run check:migrations -- --update'
  );
  process.exit(1);
}

const locked = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')).migrations;
const violations = [];

for (const [name, hash] of Object.entries(locked)) {
  if (!(name in current)) {
    violations.push(`supprimée ou renommée : ${name}`);
  } else if (current[name] !== hash) {
    violations.push(`modifiée : ${name}`);
  }
}

const unlocked = Object.keys(current).filter((f) => !(f in locked));

if (violations.length > 0) {
  console.error('\n[migrations] Migration(s) déjà livrée(s) altérée(s) :\n');
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error(
    '\nLes migrations D1 sont suivies par NOM DE FICHIER : renommer, renuméroter ou\n' +
      'réécrire un fichier déjà appliqué le fait rejouer sur staging et en production.\n' +
      'Pour corriger une migration livrée, ajoutez-en une nouvelle à la suite.\n'
  );
  process.exit(1);
}

if (unlocked.length > 0) {
  console.error('\n[migrations] Nouvelle(s) migration(s) absente(s) du manifeste :\n');
  for (const f of unlocked) console.error(`  • ${f}`);
  console.error('\nEnregistrez-les avec : npm run check:migrations -- --update\n');
  process.exit(1);
}

console.log(`[migrations] OK — ${Object.keys(locked).length} migrations figées, aucune altération.`);
