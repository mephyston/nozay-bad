import type { BlockPayload } from '../../shared/blocks';
import type { CmsPageRow } from '../../shared/schema';

export interface GetPageInput {
  pageId: number;
}

export interface GetPageOutput {
  page: CmsPageRow;
  blocks: BlockPayload[];
}
