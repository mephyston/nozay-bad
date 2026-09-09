import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { indivRequestsTable, indivSessionsTable, type IndivSessionRow } from '../../shared/indiv-schema';

export class WithdrawIndivRepository {
  async findSession(db: DbOrTx, id: number): Promise<IndivSessionRow | undefined> {
    return db.select().from(indivSessionsTable).where(eq(indivSessionsTable.id, id)).get();
  }

  async remove(db: DbOrTx, sessionId: number, memberId: number): Promise<boolean> {
    const removed = await db
      .delete(indivRequestsTable)
      .where(and(eq(indivRequestsTable.sessionId, sessionId), eq(indivRequestsTable.memberId, memberId)))
      .returning();
    return removed.length > 0;
  }
}
