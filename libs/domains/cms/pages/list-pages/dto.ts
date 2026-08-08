import type { CmsPageRow } from '../../shared/schema';

export interface ListPagesInput {
  status?: 'draft' | 'published';
}

export type ListPagesOutput = CmsPageRow[];
