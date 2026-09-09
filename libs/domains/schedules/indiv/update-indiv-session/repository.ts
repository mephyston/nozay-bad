import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable, type VenueRow } from '../../shared/schema';
import { indivRequestsTable, indivSessionsTable, type IndivSessionRow } from '../../shared/indiv-schema';

export class UpdateIndivSessionRepository {
  async findSession(db: DbOrTx, id: number): Promise<IndivSessionRow | undefined> {
    return db.select().from(indivSessionsTable).where(eq(indivSessionsTable.id, id)).get();
  }

  async findVenue(db: DbOrTx, id: number): Promise<VenueRow | undefined> {
    return db.select().from(venuesTable).where(eq(venuesTable.id, id)).get();
  }

  /** Retenus par créneau : ce que resserrer la soirée ne doit pas écraser. */
  async selectionCounts(db: DbOrTx, sessionId: number): Promise<Map<number, number>> {
    const rows = await db
      .select({ slot: indivRequestsTable.selectedSlot, count: sql<number>`count(*)` })
      .from(indivRequestsTable)
      .where(and(eq(indivRequestsTable.sessionId, sessionId), isNotNull(indivRequestsTable.selectedSlot)))
      .groupBy(indivRequestsTable.selectedSlot)
      .all();
    return new Map(rows.map((row) => [Number(row.slot), Number(row.count)]));
  }

  async update(
    db: DbOrTx,
    id: number,
    values: Partial<typeof indivSessionsTable.$inferInsert>
  ): Promise<IndivSessionRow> {
    const [row] = await db.update(indivSessionsTable).set(values).where(eq(indivSessionsTable.id, id)).returning();
    return row;
  }
}
