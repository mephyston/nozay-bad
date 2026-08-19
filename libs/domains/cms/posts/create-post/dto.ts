import type { CmsPostRow } from '../../shared/schema';

export interface CreatePostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  bodyHtml?: string;
  /** Média affiché en couverture dans les cartes et en tête d'article. */
  coverMediaId?: number | null;
  categoryIds?: number[];
  /** `public` par défaut : le site public et l'espace adhérent. */
  visibility?: 'public' | 'private';
  /** Événement de l'agenda que l'actualité annonce, s'il y en a un. */
  eventId?: number | null;
  /** Repris de WordPress à l'import, pour que rejouer ne duplique pas. */
  legacyWpId?: number;
  publishedAt?: Date;
}

export type CreatePostOutput = CmsPostRow;
