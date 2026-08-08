import type { CmsPageRow } from '../../shared/schema';

export interface UpdatePageInput {
  pageId: number;
  title?: string;
  slug?: string;
  /** `undefined` = inchangé ; `null` = remonter à la racine. */
  parentId?: number | null;
  template?: 'default' | 'home' | 'landing';
  seoTitle?: string | null;
  seoDescription?: string | null;
  noindex?: boolean;
}

export type UpdatePageOutput = CmsPageRow;
