import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  clubTeamsTable,
  championshipDaysTable,
  teamFixturesTable,
  type ClubTeamRow,
  type ChampionshipDayRow,
  type TeamFixtureRow
} from '../shared/schema';

export class SaveFixtureRepository {
  async findTeam(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  async findDay(db: DbOrTx, id: number): Promise<ChampionshipDayRow | undefined> {
    return db.select().from(championshipDaysTable).where(eq(championshipDaysTable.id, id)).get();
  }

  /**
   * Crée ou met à jour la rencontre, sur la clé `(équipe, journée, slot)`.
   *
   * L'`upsert` protège la composition déjà saisie : effacer puis réinsérer la rencontre
   * emporterait ses `lineup_slots` par cascade, et un simple changement d'adversaire
   * détruirait le travail du capitaine.
   */
  async upsert(
    db: DbOrTx,
    values: typeof teamFixturesTable.$inferInsert
  ): Promise<TeamFixtureRow> {
    const [row] = await db
      .insert(teamFixturesTable)
      .values(values)
      .onConflictDoUpdate({
        target: [teamFixturesTable.teamId, teamFixturesTable.dayId, teamFixturesTable.slot],
        set: {
          status: values.status,
          playedAt: values.playedAt ?? null,
          home: values.home,
          opponent: values.opponent ?? null,
          venue: values.venue ?? null
        }
      })
      .returning();
    return row;
  }

  async findExisting(
    db: DbOrTx,
    teamId: number,
    dayId: number,
    slot: number
  ): Promise<TeamFixtureRow | undefined> {
    return db
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
  }
}
