import type { AnnouncementRow } from '../shared/schema';

export interface UpdateAnnouncementInput {
  title: string;
  bodyHtml: string;
  status: 'draft' | 'published';
}

export type UpdateAnnouncementOutput = AnnouncementRow;
