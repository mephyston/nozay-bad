import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  championshipSettingsTable,
  clubTeamsTable,
  playerRankingsTable,
  teamRosterTable,
  type ClubTeamRow,
  type PlayerRankingRow
} from '../shared/schema';
import type { Championship } from '../shared/championship';

/** Une licence par variable liée : on reste sous les 100 que D1 accepte. */
const CHUNK = 90;

export class GetRosterBalanceRepository {
  /** Les équipes actives du championnat, de la plus haute à la plus basse. */
  async teams(db: DbOrTx, seasonCode: string, championship: Championship): Promise<ClubTeamRow[]> {
    return db
      .select()
      .from(clubTeamsTable)
      .where(
        and(
          eq(clubTeamsTable.seasonCode, seasonCode),
          eq(clubTeamsTable.championship, championship),
          eq(clubTeamsTable.active, true)
        )
      )
      .orderBy(asc(clubTeamsTable.number))
      .all();
  }

  async rosters(db: DbOrTx, teamIds: number[]): Promise<Array<{ teamId: number; licence: string }>> {
    if (teamIds.length === 0) return [];
    return db
      .select({ teamId: teamRosterTable.teamId, licence: teamRosterTable.licence })
      .from(teamRosterTable)
      .where(inArray(teamRosterTable.teamId, teamIds))
      .all();
  }

  async seasonReferenceDate(db: DbOrTx, seasonCode: string, championship: Championship): Promise<string | null> {
    const row = await db
      .select({ date: championshipSettingsTable.referenceEloDate })
      .from(championshipSettingsTable)
      .where(
        and(
          eq(championshipSettingsTable.seasonCode, seasonCode),
          eq(championshipSettingsTable.championship, championship)
        )
      )
      .get();
    return row?.date ?? null;
  }

  async latestEloDate(db: DbOrTx): Promise<string | null> {
    const row = await db
      .select({ eloDate: playerRankingsTable.eloDate })
      .from(playerRankingsTable)
      .orderBy(desc(playerRankingsTable.eloDate))
      .limit(1)
      .get();
    return row?.eloDate ?? null;
  }

  async rankingsAt(db: DbOrTx, licences: string[], eloDate: string): Promise<PlayerRankingRow[]> {
    const rows: PlayerRankingRow[] = [];
    for (let i = 0; i < licences.length; i += CHUNK) {
      rows.push(
        ...(await db
          .select()
          .from(playerRankingsTable)
          .where(and(inArray(playerRankingsTable.licence, licences.slice(i, i + CHUNK)), eq(playerRankingsTable.eloDate, eloDate)))
          .all())
      );
    }
    return rows;
  }
}
