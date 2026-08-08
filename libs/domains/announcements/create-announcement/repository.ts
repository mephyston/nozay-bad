import { type DbOrTx } from '@nba/db';
import { announcementsTable } from '../shared/schema';

export class CreateAnnouncementRepository {
  async create(
    db: DbOrTx,
    values: typeof announcementsTable.$inferInsert
  ): Promise<typeof announcementsTable.$inferSelect> {
    return db.insert(announcementsTable).values(values).returning().get();
  }
}
