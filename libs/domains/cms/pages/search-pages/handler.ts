import { type Db } from '@nba/db';
import { SearchPagesRepository } from './repository';

/**
 * Les pages publiées, prêtes à être filtrées par une recherche.
 *
 * Le titre et la description ne disent pas tout : le contenu d'une page, ce sont ses
 * blocs. Leur texte est extrait ici — titres, sous-titres, paragraphes, légendes —,
 * débarrassé du HTML, et rendu à part pour que la recherche puisse peser le titre
 * plus que le corps. Deux requêtes, quel que soit le nombre de pages.
 */
export interface SearchablePage {
  id: number;
  path: string;
  title: string;
  description: string | null;
  /** Le texte des blocs, à plat. */
  body: string;
}

/** Les champs des blocs qui portent du texte lisible ; le reste est réglage ou référence. */
const TEXT_KEYS = new Set(['title', 'subtitle', 'heading', 'html', 'text', 'caption', 'label', 'name', 'description', 'body', 'intro', 'role', 'quote']);

/** Ce qui se lit dans un bloc, quelle qu'en soit la forme : on parcourt, on ne connaît pas chaque type. */
export function blockText(payload: unknown, depth = 0): string {
  if (depth > 6 || payload === null || typeof payload !== 'object') return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (typeof value === 'string') {
      if (TEXT_KEYS.has(key)) parts.push(stripHtml(value));
    } else if (Array.isArray(value)) {
      for (const item of value) parts.push(blockText(item, depth + 1));
    } else if (value && typeof value === 'object') {
      parts.push(blockText(value, depth + 1));
    }
  }
  return parts.filter(Boolean).join(' ');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

export async function listSearchablePages(db: Db): Promise<SearchablePage[]> {
  const repo = new SearchPagesRepository();
  const pages = await repo.listPublished(db);
  const blocks = await repo.blocksOf(db, pages.map((p) => p.id));

  const bodies = new Map<number, string[]>();
  for (const block of blocks) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(block.payload);
    } catch {
      /* Un bloc illisible ne cache pas la page : son titre se cherche encore. */
    }
    const text = blockText(parsed);
    if (text) bodies.set(block.pageId, [...(bodies.get(block.pageId) ?? []), text]);
  }

  return pages.map((page) => ({
    id: page.id,
    path: page.path,
    title: page.title,
    description: page.seoDescription,
    body: (bodies.get(page.id) ?? []).join(' ')
  }));
}
