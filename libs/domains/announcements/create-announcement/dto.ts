import type { AnnouncementRow } from '../shared/schema';

export interface CreateAnnouncementInput {
  title: string;
  bodyHtml: string;
  status?: 'draft' | 'published';
}

export type CreateAnnouncementOutput = AnnouncementRow;
