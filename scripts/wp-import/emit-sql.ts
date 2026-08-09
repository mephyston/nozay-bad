import { readFileSync, writeFileSync } from 'node:fs';
import { sanitizeRichText, CMS_PROFILE } from '../../libs/shared/html/src/index';
import { readWxr, publicPath } from './wxr.mjs';
import { wpautop, rewriteImages, rewriteLinks, stripShortcodes } from './html.mjs';

/**
 * Génère le SQL de reprise.
 *
 * Produit un fichier d'INSERT, jamais une migration : le contenu n'est pas du schéma,
 * et `migrations.lock.json` le figerait pour toujours. Il s'applique avec
 * `wrangler d1 execute --file`.
 */

const WXR = '.data/wp/nozaybadmintonassociation.WordPress.2026-08-08.xml';
const OUT = '.data/wp/import.sql';
const AUTHOR = 'communication@nozaybad.fr';

/**
 * Littéral SQL, garanti sur une seule ligne.
 *
 * Un saut de ligne dans une chaîne est légal en SQLite, mais il coupe l'instruction en
 * deux pour tout outil qui découpe le fichier ligne à ligne — ce que fait le harnais de
 * vérification, et ce que peut faire n'importe quel client. On les remplace par une
 * espace : entre deux balises de bloc, le HTML n'y perd rien.
 */
const q = (value: string | null): string =>
  value === null ? 'NULL' : `'${value.replace(/[\r\n]+/g, ' ').replace(/'/g, "''")}'`;
const ts = (value: string | null): string =>
  value ? String(Math.floor(new Date(value.replace(' ', 'T') + 'Z').getTime() / 1000)) : 'NULL';
const NOW = `CAST(strftime('%s','now') AS INTEGER)`;

interface MediaEntry {
  source: string; hash: string; key: string; mimeType: string; sizeBytes: number;
  width: number | null; height: number | null;
  variants: { key: string; format: string; width: number; height: number; sizeBytes: number }[];
}

/**
 * Décisions de l'inventaire, indexées par **type et chemin**.
 *
 * Une seule clé de chemin ne suffit pas : `/livret-daccueil-jeunes/` existe à la fois
 * comme page et comme article, et la seconde ligne écrasait la première — la page
 * héritait alors du « importer » de l'article et les deux atterrissaient à la même
 * adresse.
 */
function decisions(): Map<string, { decision: string; target: string }> {
  const rows = readFileSync('.data/wp/inventaire.csv', 'utf-8').split('\n').slice(1).filter(Boolean);
  const map = new Map<string, { decision: string; target: string }>();
  for (const line of rows) {
    const cols = (line.match(/"((?:[^"]|"")*)"/g) ?? []).map((c) => c.slice(1, -1).replace(/""/g, '"'));
    map.set(`${cols[0]}|${cols[1]}`, { decision: cols[6], target: cols[7] });
  }
  return map;
}

function main() {
  const items = readWxr(WXR);
  const media: MediaEntry[] = JSON.parse(readFileSync('.data/wp/media-manifest.json', 'utf-8'));
  const bySource = new Map(media.map((m) => [m.source, m]));
  const plan = decisions();

  const sql: string[] = [
    '-- Reprise du contenu WordPress. Généré par scripts/wp-import/emit-sql.ts.',
    '-- INSERT OR IGNORE partout : le fichier doit pouvoir être rejoué sans dupliquer.',
    ''
  ];
  const notes: string[] = [];

  // --- Médias ---------------------------------------------------------------
  media.forEach((m, index) => {
    const id = index + 1;
    sql.push(
      `INSERT OR IGNORE INTO cms_media (id, key, mime_type, size_bytes, width, height, alt, content_hash, created_at) VALUES ` +
      `(${id}, ${q(m.key)}, ${q(m.mimeType)}, ${m.sizeBytes}, ${m.width ?? 'NULL'}, ${m.height ?? 'NULL'}, '', ${q(m.hash)}, ${NOW});`
    );
    for (const v of m.variants) {
      sql.push(
        `INSERT OR IGNORE INTO cms_media_variants (media_id, format, width, height, size_bytes, key) VALUES ` +
        `(${id}, ${q(v.format)}, ${v.width}, ${v.height}, ${v.sizeBytes}, ${q(v.key)});`
      );
    }
  });

  // --- Catégories -----------------------------------------------------------
  const categories = new Map<string, string>();
  for (const item of items) {
    if (item.type !== 'post' || item.status !== 'publish') continue;
    for (const c of item.categories) if (c.slug !== 'uncategorized') categories.set(c.slug, c.name);
  }
  const categoryIds = new Map<string, number>();
  [...categories].forEach(([slug, name], index) => {
    categoryIds.set(slug, index + 1);
    sql.push(
      `INSERT OR IGNORE INTO cms_post_categories (id, slug, name, nav_order, created_at) VALUES ` +
      `(${index + 1}, ${q(slug)}, ${q(name)}, ${index}, ${NOW});`
    );
  });

  /** Corps remis en forme, images réécrites, codes courts retirés. */
  function bodyOf(raw: string, label: string): string {
    const stripped = stripShortcodes(raw);
    if (stripped.shortcodes.length) notes.push(`${label} : codes courts retirés — ${stripped.shortcodes.join(', ')}`);
    const withImages = rewriteImages(wpautop(stripped.html), bySource);
    const linked = rewriteLinks(withImages, bySource);
    if (linked.orphans.length) {
      notes.push(`${label} : liens retirés vers des fichiers non repris — ${[...new Set(linked.orphans)].join(', ')}`);
    }
    return sanitizeRichText(linked.html, CMS_PROFILE);
  }

  // --- Articles -------------------------------------------------------------
  let postId = 0;
  for (const item of items) {
    if (item.type !== 'post' || item.status !== 'publish') continue;
    postId++;
    const path = publicPath(item);
    const body = bodyOf(item.body, path);
    // Le chapô alimente la liste et sert de meta description par défaut.
    const excerpt = item.excerpt?.trim() ? item.excerpt.trim().slice(0, 500) : null;

    sql.push(
      `INSERT OR IGNORE INTO cms_posts (id, slug, path, title, excerpt, body_html, status, author_name, author_email, published_at, legacy_wp_id, created_at, updated_at) VALUES ` +
      `(${postId}, ${q(item.slug)}, ${q(path)}, ${q(item.title)}, ${q(excerpt)}, ${q(body)}, 'published', ` +
      `${q('Nozay Badminton Association')}, ${q(AUTHOR)}, ${ts(item.publishedAt)}, ${item.id}, ${NOW}, ${NOW});`
    );
    for (const c of item.categories) {
      const cid = categoryIds.get(c.slug);
      if (cid) sql.push(`INSERT OR IGNORE INTO cms_post_category_links (post_id, category_id) VALUES (${postId}, ${cid});`);
    }
    if (!body.trim()) notes.push(`${path} : article au corps vide après reprise`);
  }

  // --- Pages ----------------------------------------------------------------
  let pageId = 0;
  for (const item of items) {
    if (item.type !== 'page' || item.status !== 'publish') continue;
    const path = publicPath(item);
    if (plan.get(`page|${path}`)?.decision !== 'importer') continue;

    pageId++;
    const body = bodyOf(item.body, path);
    sql.push(
      `INSERT OR IGNORE INTO cms_pages (id, slug, path, title, status, template, noindex, nav_order, published_at, updated_by_email, created_at, updated_at) VALUES ` +
      `(${pageId}, ${q(item.slug || 'accueil')}, ${q(path)}, ${q(item.title)}, 'published', ${q(path === '/' ? 'home' : 'default')}, 0, ${item.menuOrder}, ${ts(item.publishedAt)}, ${q(AUTHOR)}, ${NOW}, ${NOW});`
    );
    if (body.trim()) {
      sql.push(
        `INSERT OR IGNORE INTO cms_page_blocks (page_id, position, type, payload) VALUES ` +
        `(${pageId}, 0, 'richtext', ${q(JSON.stringify({ type: 'richtext', html: body }))});`
      );
    } else {
      notes.push(`${path} : page importée sans contenu — à regarnir`);
    }
  }

  // --- Redirections ---------------------------------------------------------
  // Chemins occupés par du contenu repris : une redirection y serait inerte, puisque
  // la résolution privilégie pages et articles. On ne l'écrit pas plutôt que de
  // laisser une ligne trompeuse dans la table.
  const occupied = new Set<string>();
  for (const [key, { decision }] of plan) if (decision === 'importer') occupied.add(key.split('|')[1]);

  let redirects = 0;
  for (const [key, { decision, target }] of plan) {
    const path = key.split('|')[1];
    if (decision !== '301' && decision !== '410') continue;
    if (occupied.has(path)) {
      notes.push(`${path} : redirection écartée, un contenu repris occupe déjà l'adresse`);
      continue;
    }
    redirects++;
    sql.push(
      `INSERT OR IGNORE INTO cms_redirects (from_path, to_path, status_code, hit_count, note, created_at) VALUES ` +
      `(${q(path)}, ${decision === '301' ? q(target) : 'NULL'}, ${decision}, 0, 'reprise WordPress', ${NOW});`
    );
  }

  writeFileSync(OUT, sql.join('\n') + '\n');
  writeFileSync('.data/wp/import-notes.txt', notes.join('\n') + '\n');

  console.log(`SQL écrit → ${OUT} (${sql.length} instructions)`);
  console.log(`  médias        ${media.length}`);
  console.log(`  catégories    ${categoryIds.size}`);
  console.log(`  articles      ${postId}`);
  console.log(`  pages         ${pageId}`);
  console.log(`  redirections  ${redirects}`);
  console.log(`\n${notes.length} point(s) à reprendre → .data/wp/import-notes.txt`);
}

main();
