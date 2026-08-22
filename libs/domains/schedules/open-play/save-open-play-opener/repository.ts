import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { openPlayOpenersTable, type OpenPlayOpenerRow } from '../../shared/open-play-schema';

export class SaveOpenPlayOpenerRepository {
  /**
   * Désigne, ou ne fait rien si la personne l'est déjà.
   *
   * `onConflictDoNothing` sur l'unique `(saison, licence)` : désigner deux fois n'est pas
   * une erreur, et la ligne n'a rien à mettre à jour — elle ne porte que la clé.
   */
  async upsert(db: DbOrTx, seasonCode: string, licence: string, now: Date): Promise<OpenPlayOpenerRow> {
    await db
      .insert(openPlayOpenersTable)
      .values({ seasonCode, licence, createdAt: now })
      .onConflictDoNothing({
        target: [openPlayOpenersTable.seasonCode, openPlayOpenersTable.licence]
      });

    return (await db
      .select()
      .from(openPlayOpenersTable)
      .where(
        and(
          eq(openPlayOpenersTable.seasonCode, seasonCode),
          eq(openPlayOpenersTable.licence, licence)
        )
      )
      .get()) as OpenPlayOpenerRow;
  }
}
