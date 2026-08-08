import type { CmsMediaRow, CmsMediaVariantRow } from '../../shared/schema';

export interface GetMediaInput {
  mediaId: number;
}

export interface GetMediaOutput {
  media: CmsMediaRow;
  variants: CmsMediaVariantRow[];
}
