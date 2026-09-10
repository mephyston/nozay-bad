import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable, type VenueRow } from '../../shared/schema';
import { indivSessionsTable, type IndivSessionRow } from '../../shared/indiv-schema';

export class CreateIndivSessionRepository {
  async findVenue(db: DbOrTx, id: number): Promise<VenueRow | undefined> {
    return db.select().from(venuesTable).where(eq(venuesTable.id, id)).get();
  }

  /**
   * Insère la soirée, ou ne fait rien si elle existe déjà — c'est la base qui tranche
   * entre deux requêtes parties en même temps, pas un « lire puis décider ».
   */
  async insertIfAbsent(
    db: DbOrTx,
    values: typeof indivSessionsTable.$inferInsert
  ): Promise<IndivSessionRow | undefined> {
    const [row] = await db
      .insert(indivSessionsTable)
      .values(values)
      .onConflictDoNothing({
        target: [indivSessionsTable.date, indivSessionsTable.venueId, indivSessionsTable.startTime]
      })
      .returning();
    return row;
  }
}
