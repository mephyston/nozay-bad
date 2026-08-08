import type { CmsMediaRow } from '../../shared/schema';
export interface ListMediaInput { limit?: number; offset?: number }
export type ListMediaOutput = CmsMediaRow[];
