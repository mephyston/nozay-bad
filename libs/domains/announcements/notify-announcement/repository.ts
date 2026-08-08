import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { announcementsTable } from '../shared/schema';

export class NotifyAnnouncementRepository {
  async findById(db: DbOrTx, id: number): Promise<typeof announcementsTable.$inferSelect | undefined> {
    return db.select().from(announcementsTable).where(eq(announcementsTable.id, id)).get();
  }

  async markNotified(db: DbOrTx, id: number, notifiedAt: Date): Promise<void> {
    await db.update(announcementsTable).set({ notifiedAt }).where(eq(announcementsTable.id, id)).run();
  }
}
