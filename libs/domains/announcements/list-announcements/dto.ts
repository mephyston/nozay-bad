import type { AnnouncementRow } from '../shared/schema';

export interface ListAnnouncementsInput {
  /** Absent = toutes les annonces (administration). */
  status?: 'draft' | 'published';
  limit?: number;
  offset?: number;
}

export type ListAnnouncementsOutput = AnnouncementRow[];
