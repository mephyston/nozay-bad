import type { CmsPostCategoryRow } from '../../shared/schema';
export interface SavePostCategoryInput { name: string; slug?: string; description?: string }
export type SavePostCategoryOutput = CmsPostCategoryRow;
