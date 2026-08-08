import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { announcementsTable } from '../shared/schema';

export class DeleteAnnouncementRepository {
  async findById(db: DbOrTx, id: number): Promise<typeof announcementsTable.$inferSelect | undefined> {
    return db.select().from(announcementsTable).where(eq(announcementsTable.id, id)).get();
  }

  async delete(db: DbOrTx, id: number): Promise<void> {
    await db.delete(announcementsTable).where(eq(announcementsTable.id, id)).run();
  }
}
