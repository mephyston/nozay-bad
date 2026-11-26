import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  championshipDaysTable,
  clubTeamsTable,
  teamFixturesTable,
  type ChampionshipDayRow,
  type ClubTeamRow,
  type TeamFixtureRow
} from '../shared/schema';

/** Sous la limite de D1 (100), avec de la marge pour les autres paramètres. */
const MAX_BOUND_VARIABLES = 90;

export class ListClubFixturesRepository {
  /** Les équipes actives de la saison. */
  teams(db: DbOrTx, seasonCode: string): Promise<ClubTeamRow[]> {
    return db
      .select()
      .from(clubTeamsTable)
      .where(and(eq(clubTeamsTable.seasonCode, seasonCode), eq(clubTeamsTable.active, true)))
      .all();
  }

  /**
   * Les journées dont la semaine croise la période. La date réelle d'une rencontre peut
   * sortir de sa semaine (gymnase indisponible) : le handler la recadre ensuite.
   */
  days(db: DbOrTx, seasonCode: string, championships: string[], from: string, to: string | undefined): Promise<ChampionshipDayRow[]> {
    if (championships.length === 0) return Promise.resolve([]);
    return db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, seasonCode),
          inArray(championshipDaysTable.championship, championships as never[]),
          gte(championshipDaysTable.weekEnd, from),
          ...(to ? [lte(championshipDaysTable.weekStart, to)] : [])
        )
      )
      .all();
  }

  /**
   * Les rencontres de ces équipes sur ces journées. Toute une saison pour tout le club peut
   * dépasser les 100 variables liées de D1 : les journées partent par lots.
   */
  async fixtures(db: DbOrTx, teamIds: number[], dayIds: number[]): Promise<TeamFixtureRow[]> {
    if (teamIds.length === 0 || dayIds.length === 0) return [];
    const perBatch = Math.max(1, MAX_BOUND_VARIABLES - teamIds.length);
    const rows: TeamFixtureRow[] = [];
    for (let i = 0; i < dayIds.length; i += perBatch) {
      rows.push(
        ...(await db
          .select()
          .from(teamFixturesTable)
          .where(and(inArray(teamFixturesTable.teamId, teamIds), inArray(teamFixturesTable.dayId, dayIds.slice(i, i + perBatch))))
          .all())
      );
    }
    return rows;
  }
}
