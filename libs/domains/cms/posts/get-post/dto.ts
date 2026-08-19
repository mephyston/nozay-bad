import type { CmsPostRow, CmsPostCategoryRow, CmsMediaRow } from '../../shared/schema';
export interface GetPostInput { postId: number }
export interface GetPostOutput {
  post: CmsPostRow;
  categories: CmsPostCategoryRow[];
  /** Couverture, pour l'en-tête de l'article et les métadonnées de partage. */
  cover: CmsMediaRow | null;
}
