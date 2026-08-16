import { and, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { championshipDaysTable, type ChampionshipDayRow } from '../shared/schema';

export class ListChampionshipDaysRepository {
  async listFor(
    db: DbOrTx,
    seasonCode: string,
    championship: ChampionshipDayRow['championship']
  ): Promise<ChampionshipDayRow[]> {
    return db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, seasonCode),
          eq(championshipDaysTable.championship, championship)
        )
      )
      .orderBy(championshipDaysTable.number)
      .all();
  }

  /**
   * Journées d'autres championnats tombant dans les mêmes semaines.
   *
   * La jointure se fait sur `week_start`, jamais sur le numéro de journée : ce sont les
   * semaines qui se comparent d'un championnat à l'autre, pas les numéros.
   */
  async concurrentDays(
    db: DbOrTx,
    seasonCode: string,
    weekStarts: string[]
  ): Promise<ChampionshipDayRow[]> {
    if (weekStarts.length === 0) return [];

    return db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, seasonCode),
          inArray(championshipDaysTable.weekStart, weekStarts)
        )
      )
      .all();
  }
}
