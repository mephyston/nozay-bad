/**
 * Exporte le contenu du site depuis la base D1 locale, sous forme de SQL de
 * remplacement applicable à une base distante.
 *
 * Sert à recopier vers staging ce qui a été composé en local — pages et blocs,
 * actualités, agenda, créneaux, menus, réglages du site — sans toucher au reste.
 *
 * Ce qui n'est **pas** exporté, délibérément :
 *
 * - `cms_redirects` : les redirections de la reprise WordPress vivent sur la cible et
 *   pas en local, où l'on n'en a qu'une poignée de test. Les écraser casserait ~160
 *   adresses héritées, référencées par les moteurs. Elles ne sont ni vidées ni
 *   réécrites.
 * - `cms_page_revisions` : de l'historique d'édition local, sans valeur ailleurs. Les
 *   lignes de la cible sont en revanche supprimées, faute de quoi elles pointeraient
 *   vers des pages qui n'existent plus.
 * - tout ce qui relève des adhérents, de la comptabilité ou des droits : ce script ne
 *   connaît que le contenu éditorial.
 *
 * Usage :
 *   node scripts/export-site-content.mjs <base.sqlite> > contenu.sql
 */
import { DatabaseSync } from 'node:sqlite';

const source = process.argv[2];
if (!source) {
  console.error('Usage : node scripts/export-site-content.mjs <base.sqlite>');
  process.exit(1);
}

/**
 * Tables recopiées, **parents avant enfants**.
 *
 * L'ordre est celui de l'insertion ; la suppression le parcourt à l'envers. Les clés
 * étrangères sont ainsi respectées de bout en bout, sans avoir à les désactiver — ce
 * qu'un import qui échoue à moitié rendrait autrement indétectable.
 */
const TABLES = [
  'cms_media',
  'cms_media_variants',
  'cms_pages',
  'cms_page_blocks',
  'cms_post_categories',
  'cms_posts',
  'cms_post_category_links',
  'cms_nav_items',
  'venues',
  'schedule_slots',
  'club_events',
  'cms_site_settings',
  'cms_content_version'
];

/** Vidées sur la cible, jamais réécrites (voir l'en-tête). */
const PURGE_ONLY = ['cms_page_revisions', 'club_event_registrations'];

const db = new DatabaseSync(source, { readOnly: true });

const quote = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'bigint') return String(value);
  if (value instanceof Uint8Array) {
    return `X'${Buffer.from(value).toString('hex')}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
};

const exists = (table) =>
  db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name=?").get(table).n > 0;

const out = [];
out.push('-- Contenu du site, exporté depuis la base locale.');
out.push(`-- Généré le ${new Date().toISOString()}`);
out.push('-- Les redirections (cms_redirects) ne sont ni vidées ni réécrites.');
out.push('');

// Suppression : enfants d'abord, donc l'ordre d'insertion à l'envers.
for (const table of [...PURGE_ONLY, ...TABLES].reverse()) {
  if (exists(table)) out.push(`DELETE FROM \`${table}\`;`);
}
out.push('');

let total = 0;
for (const table of TABLES) {
  if (!exists(table)) continue;

  const columns = db
    .prepare(`SELECT name FROM pragma_table_info('${table}')`)
    .all()
    .map((row) => row.name);

  /*
    Deux tables se référencent elles-mêmes : les pages par `parent_id`, et les entrées
    de menu depuis qu'un menu peut porter des conteneurs. Une fille insérée avant sa
    mère violerait la contrainte, et le tri par identifiant ne suffit pas — rien ne
    garantit qu'une mère porte un identifiant plus petit. On insère donc les racines
    d'abord : par profondeur de chemin pour les pages, par présence d'un parent pour
    les menus, dont l'imbrication n'a qu'un niveau.
  */
  const ORDER_BY = {
    cms_pages: "ORDER BY (LENGTH(path) - LENGTH(REPLACE(path, '/', ''))), id",
    cms_nav_items: 'ORDER BY (parent_id IS NOT NULL), id'
  };
  const order = ORDER_BY[table] ?? 'ORDER BY rowid';
  const rows = db.prepare(`SELECT * FROM \`${table}\` ${order}`).all();
  if (rows.length === 0) continue;

  out.push(`-- ${table} : ${rows.length} ligne(s)`);
  const columnList = columns.map((c) => `\`${c}\``).join(', ');
  for (const row of rows) {
    const values = columns.map((c) => quote(row[c])).join(', ');
    out.push(`INSERT INTO \`${table}\` (${columnList}) VALUES (${values});`);
  }
  out.push('');
  total += rows.length;
}

/*
  Le cache du site public entre par sa version : sans incrément, les pages déjà en cache
  au bord continueraient d'être servies jusqu'à une heure après le remplacement.
*/
out.push('-- Force la péremption du cache de page du site public.');
out.push('UPDATE `cms_content_version` SET `version` = `version` + 1 WHERE `id` = 1;');

console.log(out.join('\n'));
console.error(`[export] ${total} ligne(s) sur ${TABLES.length} table(s).`);
