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
  /**
   * Joint les déclinaisons des images **du corps**, pour les servir à leur taille.
   *
   * Sur demande et non par défaut : l'écran d'administration liste jusqu'à cent
   * articles pour les éditer, et n'a que faire de cette charge — il lui faut d'ailleurs
   * le texte tel quel, déclinaisons non appliquées.
   */
  withBodyMedia?: boolean;
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
  /**
   * Déclinaisons des images citées dans `bodyHtml`, vides sans `withBodyMedia`.
   *
   * Le corps reste **brut** : c'est à l'écran qui le rend d'appeler
   * `enhanceBodyImages`, jamais à l'API — l'administration lit la même route pour
   * éditer, et recevrait sinon un texte qu'elle réenregistrerait tel quel.
   */
  bodyVariants: CmsMediaVariantRow[];
}

export interface ListPostsOutput {
  posts: PostListItem[];
  /** Total correspondant au filtre, pour la pagination des archives. */
  total: number;
}
