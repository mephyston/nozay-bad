import type { CmsPostRow, CmsPostCategoryRow, CmsMediaRow, CmsMediaVariantRow } from '../../shared/schema';

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
 * Les champs sont ajoutés à `CmsPostRow` plutôt que substitués : les appelants
 * qui ne lisent que le titre et le chemin (flux RSS, plan du site) restent valides.
 *
 * `coverVariants` est à côté de `cover` et non dedans, pour la même raison : le
 * remplacer par un objet `{ media, variants }` casserait les lecteurs existants.
 */
export interface PostListItem extends CmsPostRow {
  cover: CmsMediaRow | null;
  /** Déclinaisons de la couverture, par largeur croissante. Vide si elle n'en a pas. */
  coverVariants: CmsMediaVariantRow[];
  categories: CmsPostCategoryRow[];
}

export interface ListPostsOutput {
  posts: PostListItem[];
  /** Total correspondant au filtre, pour la pagination des archives. */
  total: number;
}
