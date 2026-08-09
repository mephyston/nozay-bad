import type { CmsPageRow } from '../../shared/schema';

export interface RestorePageRevisionInput {
  pageId: number;
  revisionId: number;
}

export type RestorePageRevisionOutput = CmsPageRow;
