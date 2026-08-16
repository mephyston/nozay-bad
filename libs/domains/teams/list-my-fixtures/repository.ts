import { and, eq, gte, inArray, or } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  championshipDaysTable,
  clubTeamsTable,
  lineupSlotsTable,
  teamFixturesTable,
  teamRosterTable,
  teamStaffTable,
  type ChampionshipDayRow,
  type ClubTeamRow,
  type LineupSlotRow,
  type TeamFixtureRow
} from '../shared/schema';

export class ListMyFixturesRepository {
  /**
   * Les équipes auxquelles l'adhérent appartient : effectif **ou** staff.
   *
   * Un capitaine n'est pas nécessairement inscrit à son propre effectif, et il est le
   * premier concerné par la prochaine rencontre.
   */
  async teamsOf(db: DbOrTx, seasonCode: string, licence: string): Promise<ClubTeamRow[]> {
    const rosterIds = await db
      .select({ teamId: teamRosterTable.teamId })
      .from(teamRosterTable)
      .where(eq(teamRosterTable.licence, licence))
      .all();
    const staffIds = await db
      .select({ teamId: teamStaffTable.teamId })
      .from(teamStaffTable)
      .where(eq(teamStaffTable.licence, licence))
      .all();

    const ids = [...new Set([...rosterIds, ...staffIds].map((row) => row.teamId))];
    if (ids.length === 0) return [];

    return db
      .select()
      .from(clubTeamsTable)
      .where(
        and(
          eq(clubTeamsTable.seasonCode, seasonCode),
          eq(clubTeamsTable.active, true),
          inArray(clubTeamsTable.id, ids)
        )
      )
      .all();
  }

  /** Les journées non encore terminées, semaine en cours comprise. */
  async upcomingDays(
    db: DbOrTx,
    seasonCode: string,
    championships: string[],
    today: string
  ): Promise<ChampionshipDayRow[]> {
    if (championships.length === 0) return [];
    return db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, seasonCode),
          inArray(championshipDaysTable.championship, championships as never[]),
          gte(championshipDaysTable.weekEnd, today)
        )
      )
      .all();
  }

  async fixturesFor(db: DbOrTx, teamIds: number[], dayIds: number[]): Promise<TeamFixtureRow[]> {
    if (teamIds.length === 0 || dayIds.length === 0) return [];
    return db
      .select()
      .from(teamFixturesTable)
      .where(
        and(inArray(teamFixturesTable.teamId, teamIds), inArray(teamFixturesTable.dayId, dayIds))
      )
      .all();
  }

  /** Une composition a-t-elle été saisie sur cette rencontre, quelle qu'elle soit ? */
  async hasLineup(db: DbOrTx, fixtureId: number): Promise<boolean> {
    const row = await db
      .select({ id: lineupSlotsTable.id })
      .from(lineupSlotsTable)
      .where(eq(lineupSlotsTable.fixtureId, fixtureId))
      .get();
    return Boolean(row);
  }

  /** Les lignes où l'adhérent est aligné, sur les rencontres considérées. */
  async slotsOf(db: DbOrTx, fixtureIds: number[], licence: string): Promise<LineupSlotRow[]> {
    if (fixtureIds.length === 0) return [];
    return db
      .select()
      .from(lineupSlotsTable)
      .where(
        and(
          inArray(lineupSlotsTable.fixtureId, fixtureIds),
          or(eq(lineupSlotsTable.licence1, licence), eq(lineupSlotsTable.licence2, licence))
        )
      )
      .all();
  }
}
