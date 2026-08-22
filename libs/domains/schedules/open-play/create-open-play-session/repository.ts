import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { venuesTable, type VenueRow } from '../../shared/schema';
import { openPlaySessionsTable, type OpenPlaySessionRow } from '../../shared/open-play-schema';

export class CreateOpenPlaySessionRepository {
  async findVenue(db: DbOrTx, id: number): Promise<VenueRow | undefined> {
    return db.select().from(venuesTable).where(eq(venuesTable.id, id)).get();
  }

  /**
   * Insère la séance, ou ne fait rien si elle existe déjà.
   *
   * `onConflictDoNothing` sur la clé naturelle plutôt qu'un « lire puis décider » : deux
   * requêtes parties en même temps — un double-clic suffit — passeraient toutes deux la
   * lecture et créeraient deux séances au même endroit à la même heure. Ici la base
   * tranche, et l'absence de ligne en retour dit au handler que c'était un doublon.
   */
  async insertIfAbsent(
    db: DbOrTx,
    values: typeof openPlaySessionsTable.$inferInsert
  ): Promise<OpenPlaySessionRow | undefined> {
    const [row] = await db
      .insert(openPlaySessionsTable)
      .values(values)
      .onConflictDoNothing({
        target: [
          openPlaySessionsTable.date,
          openPlaySessionsTable.venueId,
          openPlaySessionsTable.startTime
        ]
      })
      .returning();
    return row;
  }
}
