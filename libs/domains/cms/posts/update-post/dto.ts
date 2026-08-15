import type { CmsPostRow } from '../../shared/schema';

export interface UpdatePostInput {
  postId: number;
  title?: string;
  excerpt?: string | null;
  bodyHtml?: string;
  /** `null` retire la couverture ; absent la laisse inchangée. */
  coverMediaId?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  categoryIds?: number[];
  visibility?: 'public' | 'private';
  /** `null` détache l'événement ; absent le laisse inchangé. */
  eventId?: number | null;
}

export type UpdatePostOutput = CmsPostRow;
