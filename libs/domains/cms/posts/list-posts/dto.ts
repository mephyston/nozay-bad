import type { CmsPostRow } from '../../shared/schema';

export interface ListPostsInput {
  status?: 'draft' | 'published';
  categorySlug?: string;
  limit?: number;
  offset?: number;
}

export interface ListPostsOutput {
  posts: CmsPostRow[];
  /** Total correspondant au filtre, pour la pagination des archives. */
  total: number;
}
