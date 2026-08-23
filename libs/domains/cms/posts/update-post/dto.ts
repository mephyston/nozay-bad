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
  /**
   * Date de publication, corrigeable après coup. `null` la retire ; absente la laisse
   * inchangée.
   *
   * C'est elle qui range l'actualité dans le fil : la reculer fait remonter un article
   * ressaisi à sa place chronologique, celle des faits qu'il raconte.
   */
  publishedAt?: Date | null;
}

export type UpdatePostOutput = CmsPostRow;
