import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { indivRequestsTable, indivSessionsTable, type IndivSessionRow } from '../../shared/indiv-schema';

export class SelectIndivRepository {
  async findSession(db: DbOrTx, id: number): Promise<IndivSessionRow | undefined> {
    return db.select().from(indivSessionsTable).where(eq(indivSessionsTable.id, id)).get();
  }

  async requestIds(db: DbOrTx, sessionId: number): Promise<number[]> {
    const rows = await db
      .select({ id: indivRequestsTable.id })
      .from(indivRequestsTable)
      .where(eq(indivRequestsTable.sessionId, sessionId))
      .all();
    return rows.map((row) => row.id);
  }

  /** Le `UPDATE` de remise à zéro doit rester **avant** les affectations. */
  buildReplaceStatements(
    db: DbOrTx,
    sessionId: number,
    selection: Array<{ requestId: number; slot: number }>,
    now: Date
  ): unknown[] {
    return [
      db
        .update(indivRequestsTable)
        .set({ selectedSlot: null, updatedAt: now })
        .where(eq(indivRequestsTable.sessionId, sessionId)),
      ...selection.map((pick) =>
        db
          .update(indivRequestsTable)
          .set({ selectedSlot: pick.slot, updatedAt: now })
          .where(and(eq(indivRequestsTable.id, pick.requestId), eq(indivRequestsTable.sessionId, sessionId)))
      )
    ];
  }
}
