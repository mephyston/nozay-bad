import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubEventsTable, type ClubEventRow } from '../shared/schema';

export class DeleteEventRepository {
  async findById(db: DbOrTx, id: number): Promise<ClubEventRow | undefined> {
    return db.select().from(clubEventsTable).where(eq(clubEventsTable.id, id)).get();
  }
  async remove(db: DbOrTx, id: number): Promise<void> {
    await db.delete(clubEventsTable).where(eq(clubEventsTable.id, id)).run();
  }
}
