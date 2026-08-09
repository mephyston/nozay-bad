import type { CmsPostRow } from '../../shared/schema';

export interface UpdatePostInput {
  postId: number;
  title?: string;
  excerpt?: string | null;
  bodyHtml?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  categoryIds?: number[];
}

export type UpdatePostOutput = CmsPostRow;
