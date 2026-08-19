import type { CmsPageRow } from '../../shared/schema';

export interface PublishPageInput {
  pageId: number;
  /** `false` dépublie : la page repasse en brouillon et disparaît du site. */
  published: boolean;
}

export type PublishPageOutput = CmsPageRow;
