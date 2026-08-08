import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { announcementsTable } from '../shared/schema';

export class UpdateAnnouncementRepository {
  async findById(db: DbOrTx, id: number): Promise<typeof announcementsTable.$inferSelect | undefined> {
    return db.select().from(announcementsTable).where(eq(announcementsTable.id, id)).get();
  }

  async update(
    db: DbOrTx,
    id: number,
    values: Partial<typeof announcementsTable.$inferInsert>
  ): Promise<typeof announcementsTable.$inferSelect> {
    return db.update(announcementsTable).set(values).where(eq(announcementsTable.id, id)).returning().get();
  }
}
