import type { CmsPostRow, CmsPostCategoryRow, CmsMediaRow } from '../../shared/schema';

export interface ListPostsInput {
  status?: 'draft' | 'published';
  /**
   * Restreint aux actualités publiques.
   *
   * Posé par la **route** d'après l'appelant, jamais par le client : le site public et
   * l'espace adhérent interrogent la même liste, et c'est l'API qui tranche.
   */
  visibility?: 'public' | 'private';
  categorySlug?: string;
  limit?: number;
  offset?: number;
}

/**
 * Article enrichi de quoi composer une carte sans requête supplémentaire.
 *
 * Les deux champs sont ajoutés à `CmsPostRow` plutôt que substitués : les appelants
 * qui ne lisent que le titre et le chemin (flux RSS, plan du site) restent valides.
 */
export interface PostListItem extends CmsPostRow {
  cover: CmsMediaRow | null;
  categories: CmsPostCategoryRow[];
}

export interface ListPostsOutput {
  posts: PostListItem[];
  /** Total correspondant au filtre, pour la pagination des archives. */
  total: number;
}
