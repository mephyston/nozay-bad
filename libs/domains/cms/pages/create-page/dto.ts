import type { CmsPageRow } from '../../shared/schema';

export interface CreatePageInput {
  title: string;
  /** Absent = dérivé du titre. */
  slug?: string;
  parentId?: number | null;
  template?: 'default' | 'home' | 'landing';
  seoTitle?: string;
  seoDescription?: string;
  noindex?: boolean;
}

export type CreatePageOutput = CmsPageRow;
