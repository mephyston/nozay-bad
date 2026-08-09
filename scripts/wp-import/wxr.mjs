import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';

/**
 * Lecture de l'export WordPress (WXR).
 *
 * On lit le fichier plutôt que l'API REST : l'origine tombe en 503 au bout d'une
 * vingtaine de requêtes, et l'export contient le contenu brut. Il ne contient en
 * revanche presque aucun bloc Gutenberg — sur ce site, 1 page sur 193 — donc la
 * conversion travaille sur du HTML d'éditeur classique.
 */

const NS_STRIP = { 'wp:': '', 'content:': '', 'dc:': '', 'excerpt:': '' };

function stripNs(name) {
  for (const [prefix, replacement] of Object.entries(NS_STRIP)) {
    if (name.startsWith(prefix)) return replacement + name.slice(prefix.length);
  }
  return name;
}

export function readWxr(path) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    cdataPropName: '__cdata',
    transformTagName: stripNs,
    // Les champs à occurrence unique deviennent des scalaires ; on force les listes
    // pour `item`, `category` et `postmeta`, dont le nombre varie.
    isArray: (name) => ['item', 'category', 'postmeta'].includes(name)
  });

  const doc = parser.parse(readFileSync(path, 'utf-8'));
  const channel = doc.rss.channel;
  return (channel.item ?? []).map(normalise);
}

/** `fast-xml-parser` rend soit une chaîne, soit `{ __cdata }`, soit un nombre. */
function text(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return String(value.__cdata ?? value['#text'] ?? '');
  return String(value);
}

function normalise(item) {
  const meta = {};
  for (const entry of item.postmeta ?? []) meta[text(entry.meta_key)] = text(entry.meta_value);

  const categories = (item.category ?? [])
    .filter((c) => c['@domain'] === 'category')
    .map((c) => ({ slug: c['@nicename'], name: text(c) }));

  return {
    id: Number(text(item.post_id)),
    type: text(item.post_type),
    status: text(item.status),
    title: text(item.title).trim(),
    slug: text(item.post_name),
    link: text(item.link),
    parentId: Number(text(item.post_parent) || 0),
    menuOrder: Number(text(item.menu_order) || 0),
    author: text(item.creator),
    publishedAt: text(item.post_date_gmt),
    body: text(item.encoded instanceof Array ? item.encoded[0] : item.encoded),
    excerpt: text(item.excerpt_encoded ?? ''),
    attachmentUrl: text(item.attachment_url),
    categories,
    meta
  };
}

/** Chemin public d'un élément, dérivé de son `link` — la forme réellement indexée. */
export function publicPath(item, siteUrl = 'https://nozaybad.fr') {
  try {
    const url = new URL(item.link || `${siteUrl}/${item.slug}/`);
    let path = url.pathname;
    if (!path.endsWith('/')) path += '/';
    return path.toLowerCase();
  } catch {
    return `/${item.slug}/`;
  }
}
