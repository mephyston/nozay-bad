import { and, desc, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  championshipDaysTable,
  teamFixturesTable,
  lineupSlotsTable,
  clubTeamsTable,
  teamStaffTable,
  teamRosterTable,
  playerRankingsTable,
  championshipSettingsTable,
  type ClubTeamRow,
  type TeamStaffRow,
  type PlayerRankingRow
} from '../shared/schema';

export class GetTeamRepository {
  async findTeam(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  async staffFor(db: DbOrTx, teamId: number): Promise<TeamStaffRow[]> {
    return db.select().from(teamStaffTable).where(eq(teamStaffTable.teamId, teamId)).all();
  }

  async rosterLicences(db: DbOrTx, teamId: number): Promise<string[]> {
    const rows = await db
      .select({ licence: teamRosterTable.licence })
      .from(teamRosterTable)
      .where(eq(teamRosterTable.teamId, teamId))
      .all();
    return rows.map((row) => row.licence);
  }

  async settingsFor(
    db: DbOrTx,
    seasonCode: string,
    championship: ClubTeamRow['championship']
  ) {
    return db
      .select()
      .from(championshipSettingsTable)
      .where(
        and(
          eq(championshipSettingsTable.seasonCode, seasonCode),
          eq(championshipSettingsTable.championship, championship)
        )
      )
      .get();
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

  /**
   * Classements d'un ensemble de licences à une date donnée.
   *
   * On lit la date **exacte** ici, et non « la plus récente antérieure » : l'appelant a
   * déjà tranché quelle date fait foi, et refaire ce choix au niveau du dépôt le
   * dupliquerait à un endroit où il ne se teste pas.
   */
  async rankingsAt(db: DbOrTx, licences: string[], eloDate: string): Promise<PlayerRankingRow[]> {
    if (licences.length === 0) return [];

    const rows: PlayerRankingRow[] = [];
    const chunkSize = 90;
    for (let i = 0; i < licences.length; i += chunkSize) {
      const chunk = licences.slice(i, i + chunkSize);
      const found = await db
        .select()
        .from(playerRankingsTable)
        .where(
          and(inArray(playerRankingsTable.licence, chunk), eq(playerRankingsTable.eloDate, eloDate))
        )
        .all();
      rows.push(...found);
    }
    return rows;
  }

  /**
   * Le calendrier de l'équipe : chaque journée, sa rencontre s'il y en a une, et le
   * nombre de lignes déjà composées. C'est ce que capitaines et joueurs consultent.
   */
  async calendarFor(db: DbOrTx, team: ClubTeamRow) {
    const days = await db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, team.seasonCode),
          eq(championshipDaysTable.championship, team.championship)
        )
      )
      .orderBy(championshipDaysTable.number)
      .all();

    const fixtures = await db
      .select()
      .from(teamFixturesTable)
      .where(eq(teamFixturesTable.teamId, team.id))
      .all();

    const slots = fixtures.length
      ? await db
          .select()
          .from(lineupSlotsTable)
          .where(inArray(lineupSlotsTable.fixtureId, fixtures.map((f) => f.id)))
          .all()
      : [];

    return { days, fixtures, slots };
  }
}
