import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  championshipDaysTable,
  clubTeamsTable,
  lineupSlotsTable,
  teamFixturesTable,
  type ClubTeamRow
} from '../shared/schema';

export class NotifyValueOverflowRepository {
  async findTeam(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  async findDayId(
    db: DbOrTx,
    seasonCode: string,
    championship: string,
    number: number
  ): Promise<number | undefined> {
    const row = await db
      .select({ id: championshipDaysTable.id })
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, seasonCode),
          eq(championshipDaysTable.championship, championship as never),
          eq(championshipDaysTable.number, number)
        )
      )
      .get();
    return row?.id;
  }

  /** La rencontre de l'équipe voisine a-t-elle une composition **validée** ? */
  async hasValidatedFixture(
    db: DbOrTx,
    teamId: number,
    dayId: number,
    slot: number
  ): Promise<boolean> {
    const fixture = await db
      .select({ id: teamFixturesTable.id })
      .from(teamFixturesTable)
      .where(
        and(
          eq(teamFixturesTable.teamId, teamId),
          eq(teamFixturesTable.dayId, dayId),
          eq(teamFixturesTable.slot, slot)
        )
      )
      .get();
    if (!fixture) return false;

    const validated = await db
      .select({ id: lineupSlotsTable.id })
      .from(lineupSlotsTable)
      .where(
        and(eq(lineupSlotsTable.fixtureId, fixture.id), eq(lineupSlotsTable.status, 'validated'))
      )
      .get();
    return validated !== undefined;
  }
}
