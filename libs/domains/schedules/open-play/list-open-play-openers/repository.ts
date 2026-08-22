import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  openPlayOpenersTable,
  openPlaySessionsTable,
  type OpenPlayOpenerRow
} from '../../shared/open-play-schema';

export class ListOpenPlayOpenersRepository {
  async list(db: DbOrTx, seasonCode: string): Promise<OpenPlayOpenerRow[]> {
    return db
      .select()
      .from(openPlayOpenersTable)
      .where(eq(openPlayOpenersTable.seasonCode, seasonCode))
      .orderBy(asc(openPlayOpenersTable.licence))
      .all();
  }

  /**
   * Combien de séances chacun a ouvertes, en une requête.
   *
   * Agrégé en base : la liste compte cinq personnes, mais un compte par ligne resterait
   * cinq allers-retours D1 pour une addition — et la même paresse à dix.
   */
  async openedCounts(db: DbOrTx, seasonCode: string): Promise<Map<string, number>> {
    const rows = await db
      .select({
        licence: openPlaySessionsTable.openerLicence,
        opened: sql<number>`count(*)`
      })
      .from(openPlaySessionsTable)
      .where(
        and(
          eq(openPlaySessionsTable.seasonCode, seasonCode),
          isNotNull(openPlaySessionsTable.openerLicence)
        )
      )
      .groupBy(openPlaySessionsTable.openerLicence)
      .all();

    return new Map(rows.map((row) => [row.licence as string, Number(row.opened)]));
  }
}
