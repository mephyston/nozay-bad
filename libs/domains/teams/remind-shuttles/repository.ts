import { and, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  championshipDaysTable,
  clubTeamsTable,
  teamFixturesTable,
  teamStaffTable,
  type ChampionshipDayRow,
  type ClubTeamRow,
  type TeamFixtureRow
} from '../shared/schema';

export class RemindShuttlesRepository {
  teams(db: DbOrTx, seasonCode: string, championships: string[]): Promise<ClubTeamRow[]> {
    if (championships.length === 0) return Promise.resolve([]);
    return db
      .select()
      .from(clubTeamsTable)
      .where(and(eq(clubTeamsTable.seasonCode, seasonCode), eq(clubTeamsTable.active, true), inArray(clubTeamsTable.championship, championships as never[])))
      .all();
  }

  days(db: DbOrTx, seasonCode: string, championships: string[]): Promise<ChampionshipDayRow[]> {
    if (championships.length === 0) return Promise.resolve([]);
    return db
      .select()
      .from(championshipDaysTable)
      .where(and(eq(championshipDaysTable.seasonCode, seasonCode), inArray(championshipDaysTable.championship, championships as never[])))
      .all();
  }

  fixtures(db: DbOrTx, teamIds: number[], dayIds: number[]): Promise<TeamFixtureRow[]> {
    if (teamIds.length === 0 || dayIds.length === 0) return Promise.resolve([]);
    return db
      .select()
      .from(teamFixturesTable)
      .where(and(inArray(teamFixturesTable.teamId, teamIds), inArray(teamFixturesTable.dayId, dayIds)))
      .all();
  }

  /** Capitaine et vice-capitaine, par équipe. */
  async staff(db: DbOrTx, teamIds: number[]): Promise<Map<number, string[]>> {
    if (teamIds.length === 0) return new Map();
    const rows = await db
      .select({ teamId: teamStaffTable.teamId, licence: teamStaffTable.licence })
      .from(teamStaffTable)
      .where(inArray(teamStaffTable.teamId, teamIds))
      .all();
    const byTeam = new Map<number, string[]>();
    for (const row of rows) byTeam.set(row.teamId, [...(byTeam.get(row.teamId) ?? []), row.licence]);
    return byTeam;
  }
}
