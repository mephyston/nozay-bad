import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubTeamsTable,
  championshipDaysTable,
  teamFixturesTable,
  teamStaffTable,
  lineupSlotsTable,
  type TeamFixtureRow
} from '../shared/schema';
import { chunkForD1 } from '../shared/d1-batch';

/** `fixture_id`, discipline, position, licence1, licence2, statut, auteur, date. */
const LINEUP_COLUMNS = 8;

export class SaveLineupRepository {
  async isStaff(db: DbOrTx, teamId: number, licence: string): Promise<boolean> {
    const rows = await db
      .select({ licence: teamStaffTable.licence })
      .from(teamStaffTable)
      .where(eq(teamStaffTable.teamId, teamId))
      .all();
    return rows.some((row) => row.licence === licence);
  }

  /**
   * La rencontre, créée à la volée si le coach ne l'a pas encore saisie.
   *
   * Un capitaine ne doit pas être empêché de composer parce que l'adversaire n'est pas
   * encore renseigné : la journée existe, cela suffit à préparer son équipe.
   */
  async ensureFixture(
    db: DbOrTx,
    teamId: number,
    dayId: number,
    slot: number,
    now: Date
  ): Promise<TeamFixtureRow> {
    const existing = await db
      .select()
      .from(teamFixturesTable)
      .where(
        and(
          eq(teamFixturesTable.teamId, teamId),
          eq(teamFixturesTable.dayId, dayId),
          eq(teamFixturesTable.slot, slot)
        )
      )
      .get();
    if (existing) return existing;

    const [row] = await db
      .insert(teamFixturesTable)
      .values({
        teamId,
        dayId,
        slot,
        status: 'scheduled',
        createdAt: now
      })
      .returning();
    return row;
  }

  /**
   * Remplace la composition : on efface puis on réécrit.
   *
   * Une ligne vidée doit disparaître, et non rester à l'ancienne valeur — c'est le nombre
   * de lignes présentes qui donne le diviseur de la valeur d'équipe.
   */
  async replaceLines(
    db: DbOrTx,
    fixtureId: number,
    lines: Array<typeof lineupSlotsTable.$inferInsert>
  ): Promise<void> {
    await db.delete(lineupSlotsTable).where(eq(lineupSlotsTable.fixtureId, fixtureId));
    for (const chunk of chunkForD1(lines, LINEUP_COLUMNS)) {
      if (chunk.length > 0) await db.insert(lineupSlotsTable).values(chunk);
    }
  }

  /** La composition en base était-elle déjà validée ? Lu avant de l'écraser. */
  async hasValidatedLines(db: DbOrTx, fixtureId: number): Promise<boolean> {
    const rows = await db
      .select({ status: lineupSlotsTable.status })
      .from(lineupSlotsTable)
      .where(eq(lineupSlotsTable.fixtureId, fixtureId))
      .all();
    return rows.some((row) => row.status === 'validated');
  }

  async findTeam(db: DbOrTx, id: number) {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  async findDay(db: DbOrTx, seasonCode: string, championship: string, number: number) {
    return db
      .select()
      .from(championshipDaysTable)
      .where(
        and(
          eq(championshipDaysTable.seasonCode, seasonCode),
          eq(championshipDaysTable.championship, championship as never),
          eq(championshipDaysTable.number, number)
        )
      )
      .get();
  }
}
