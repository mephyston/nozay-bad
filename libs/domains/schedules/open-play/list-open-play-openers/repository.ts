import { and, asc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  openPlayOpenersTable,
  openPlaySessionsTable,
  type OpenPlayOpenerRow
} from '../../shared/open-play-schema';
import { seasonDateRange } from '../../shared/season';

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
    // Les séances ne portent plus de saison : ce sont des dates, et la saison est la
    // fenêtre qui les contient.
    const { from, to } = seasonDateRange(seasonCode);
    const rows = await db
      .select({
        licence: openPlaySessionsTable.openerLicence,
        opened: sql<number>`count(*)`
      })
      .from(openPlaySessionsTable)
      .where(
        and(
          gte(openPlaySessionsTable.date, from),
          lte(openPlaySessionsTable.date, to),
          isNotNull(openPlaySessionsTable.openerLicence)
        )
      )
      .groupBy(openPlaySessionsTable.openerLicence)
      .all();

    return new Map(rows.map((row) => [row.licence as string, Number(row.opened)]));
  }
}
