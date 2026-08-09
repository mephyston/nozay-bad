import type { CmsPostRow } from '../../shared/schema';

export interface CreatePostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  bodyHtml?: string;
  categoryIds?: number[];
  /** Repris de WordPress à l'import, pour que rejouer ne duplique pas. */
  legacyWpId?: number;
  publishedAt?: Date;
}

export type CreatePostOutput = CmsPostRow;
