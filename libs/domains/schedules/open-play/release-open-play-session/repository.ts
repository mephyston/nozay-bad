import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { openPlaySessionsTable, type OpenPlaySessionRow } from '../../shared/open-play-schema';

export class ReleaseOpenPlaySessionRepository {
  async findSession(db: DbOrTx, id: number): Promise<OpenPlaySessionRow | undefined> {
    return db.select().from(openPlaySessionsTable).where(eq(openPlaySessionsTable.id, id)).get();
  }

  /**
   * Libère la séance, **si c'est bien nous qui la tenions** — même verrou optimiste qu'à
   * la prise. La condition dans le `WHERE` évite qu'une rétractation partie en même temps
   * qu'une reprise n'efface l'ouvreur suivant.
   */
  async release(
    db: DbOrTx,
    sessionId: number,
    licence: string,
    now: Date
  ): Promise<OpenPlaySessionRow | undefined> {
    const [row] = await db
      .update(openPlaySessionsTable)
      .set({
        openerLicence: null,
        openerFirstName: null,
        openerLastName: null,
        openedAt: null,
        status: 'open',
        updatedAt: now
      })
      .where(
        and(
          eq(openPlaySessionsTable.id, sessionId),
          eq(openPlaySessionsTable.openerLicence, licence)
        )
      )
      .returning();
    return row;
  }
}
