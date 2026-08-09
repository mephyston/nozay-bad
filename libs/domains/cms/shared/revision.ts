import type { CmsPageRow } from './schema';
import type { BlockPayload } from './blocks';

/**
 * Instantané d'une page.
 *
 * On enregistre l'état **avant** modification, pas après : ce que l'on veut pouvoir
 * retrouver, c'est la version qui marchait, pas celle qu'on vient d'écrire. Un
 * instantané complet plutôt qu'un différentiel — restaurer devient une réécriture,
 * sans avoir à rejouer une chaîne de modifications.
 */
export interface PageSnapshot {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  template: string;
  seoTitle: string | null;
  seoDescription: string | null;
  noindex: boolean;
  blocks: BlockPayload[];
}

export function snapshotOf(page: CmsPageRow, blocks: BlockPayload[]): PageSnapshot {
  return {
    title: page.title,
    slug: page.slug,
    status: page.status,
    template: page.template,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    noindex: page.noindex,
    blocks
  };
}

/**
 * Nombre de révisions conservées par page.
 *
 * Au-delà, l'intérêt décroît vite alors que la table grossit sans limite : personne ne
 * restaure la trentième version d'une page de club.
 */
export const MAX_REVISIONS_PER_PAGE = 20;
