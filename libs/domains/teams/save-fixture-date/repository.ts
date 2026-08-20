import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubTeamsTable,
  championshipDaysTable,
  teamFixturesTable,
  teamStaffTable,
  type ClubTeamRow,
  type ChampionshipDayRow,
  type TeamFixtureRow
} from '../shared/schema';

export class SaveFixtureDateRepository {
  async findTeam(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  async isStaff(db: DbOrTx, teamId: number, licence: string): Promise<boolean> {
    const rows = await db
      .select({ licence: teamStaffTable.licence })
      .from(teamStaffTable)
      .where(eq(teamStaffTable.teamId, teamId))
      .all();
    return rows.some((row) => row.licence === licence);
  }

  async findDay(
    db: DbOrTx,
    seasonCode: string,
    championship: ClubTeamRow['championship'],
    number: number
  ): Promise<ChampionshipDayRow | undefined> {
    return db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, seasonCode),
          eq(championshipDaysTable.championship, championship),
          eq(championshipDaysTable.number, number)
        )
      )
      .get();
  }

  /**
   * Écrit la date sans toucher au reste de la rencontre.
   *
   * `onConflictDoUpdate` plutôt qu'un effacement suivi d'une réécriture : la rencontre
   * porte la composition par clé étrangère en cascade, et la recréer effacerait le
   * travail du capitaine à chaque changement d'horaire.
   */
  async upsertDate(
    db: DbOrTx,
    key: { teamId: number; dayId: number; slot: number },
    values: { playedAt: string | null; venue: string | null; opponent: string | null },
    now: Date
  ): Promise<TeamFixtureRow> {
    const [row] = await db
      .insert(teamFixturesTable)
      .values({ ...key, status: 'scheduled', ...values, createdAt: now })
      .onConflictDoUpdate({
        target: [teamFixturesTable.teamId, teamFixturesTable.dayId, teamFixturesTable.slot],
        set: { playedAt: values.playedAt, venue: values.venue, opponent: values.opponent }
      })
      .returning();
    return row;
  }
}
