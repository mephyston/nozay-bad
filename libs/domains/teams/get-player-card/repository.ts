import { and, desc, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubTeamsTable,
  teamRosterTable,
  playerRankingsTable,
  type ClubTeamRow,
  type PlayerRankingRow
} from '../shared/schema';

export class GetPlayerCardRepository {
  /** Les équipes actives de la saison où la licence figure à l'effectif. */
  async teamsFor(db: DbOrTx, licence: string, seasonCode: string): Promise<ClubTeamRow[]> {
    const rows = await db
      .select({ team: clubTeamsTable })
      .from(teamRosterTable)
      .innerJoin(clubTeamsTable, eq(clubTeamsTable.id, teamRosterTable.teamId))
      .where(
        and(
          eq(teamRosterTable.licence, licence),
          eq(clubTeamsTable.seasonCode, seasonCode),
          eq(clubTeamsTable.active, true)
        )
      )
      .all();
    return rows.map((row) => row.team);
  }

  /** La date de classement la plus récente connue, toutes saisons confondues. */
  async latestEloDate(db: DbOrTx): Promise<string | null> {
    const row = await db
      .select({ eloDate: playerRankingsTable.eloDate })
      .from(playerRankingsTable)
      .orderBy(desc(playerRankingsTable.eloDate))
      .limit(1)
      .get();
    return row?.eloDate ?? null;
  }

  async rankingAt(db: DbOrTx, licence: string, eloDate: string): Promise<PlayerRankingRow | undefined> {
    return db
      .select()
      .from(playerRankingsTable)
      .where(and(eq(playerRankingsTable.licence, licence), eq(playerRankingsTable.eloDate, eloDate)))
      .get();
  }
}
