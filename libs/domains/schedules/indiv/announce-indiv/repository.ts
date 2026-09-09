import { asc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  indivRequestsTable,
  indivSessionsTable,
  type IndivRequestRow,
  type IndivSessionRow
} from '../../shared/indiv-schema';

export class AnnounceIndivRepository {
  async findSession(db: DbOrTx, id: number): Promise<IndivSessionRow | undefined> {
    return db.select().from(indivSessionsTable).where(eq(indivSessionsTable.id, id)).get();
  }

  async requestsOf(db: DbOrTx, sessionId: number): Promise<IndivRequestRow[]> {
    return db
      .select()
      .from(indivRequestsTable)
      .where(eq(indivRequestsTable.sessionId, sessionId))
      .orderBy(asc(indivRequestsTable.selectedSlot), asc(indivRequestsTable.lastName))
      .all();
  }

  async markAnnounced(db: DbOrTx, id: number, now: Date): Promise<IndivSessionRow> {
    const [row] = await db
      .update(indivSessionsTable)
      .set({ status: 'announced', announcedAt: now, updatedAt: now })
      .where(eq(indivSessionsTable.id, id))
      .returning();
    return row;
  }
}
