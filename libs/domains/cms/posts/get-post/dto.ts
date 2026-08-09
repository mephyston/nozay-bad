import type { CmsPostRow, CmsPostCategoryRow } from '../../shared/schema';
export interface GetPostInput { postId: number }
export interface GetPostOutput { post: CmsPostRow; categories: CmsPostCategoryRow[] }
