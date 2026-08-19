import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubEventsTable,
  clubEventRegistrationsTable,
  type ClubEventRow
} from '../shared/schema';

export class UnregisterFromEventRepository {
  async findEvent(db: DbOrTx, id: number): Promise<ClubEventRow | undefined> {
    return db.select().from(clubEventsTable).where(eq(clubEventsTable.id, id)).get();
  }

  async remove(db: DbOrTx, eventId: number, memberId: number): Promise<boolean> {
    const rows = await db
      .delete(clubEventRegistrationsTable)
      .where(
        and(
          eq(clubEventRegistrationsTable.eventId, eventId),
          eq(clubEventRegistrationsTable.memberId, memberId)
        )
      )
      .returning();
    return rows.length > 0;
  }
}
