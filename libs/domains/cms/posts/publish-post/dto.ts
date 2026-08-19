import type { CmsPostRow } from '../../shared/schema';
export interface PublishPostInput { postId: number; published: boolean }
export type PublishPostOutput = CmsPostRow;
