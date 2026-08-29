import { type Db } from '@nba/db';
import { ListAnnouncementsRepository } from './repository';
import type { AnnouncementPost, ListAnnouncementsInput } from './dto';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function listAnnouncements(
  db: Db,
  filters: ListAnnouncementsInput = {}
): Promise<{ posts: AnnouncementPost[] }> {
  const repo = new ListAnnouncementsRepository();
  return {
    posts: await repo.list(db, {
      visibility: filters.visibility,
      limit: Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    })
  };
}
