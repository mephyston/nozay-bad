import { and, desc, eq, lt } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubTeamsTable, type ClubTeamRow } from '../shared/schema';

export class NotifyCaptainRepository {
  async findTeam(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  /**
   * L'équipe qui précède dans la hiérarchie du club : le numéro **immédiatement inférieur**
   * du même championnat, et non `number - 1` — une équipe dissoute en cours de saison
   * laisserait un trou, et le plafond serait alors cherché sur une équipe inexistante.
   */
  async findUpperTeam(db: DbOrTx, team: ClubTeamRow): Promise<ClubTeamRow | undefined> {
    return db
      .select()
      .from(clubTeamsTable)
      .where(
        and(
          eq(clubTeamsTable.seasonCode, team.seasonCode),
          eq(clubTeamsTable.championship, team.championship),
          lt(clubTeamsTable.number, team.number),
          eq(clubTeamsTable.active, true)
        )
      )
      .orderBy(desc(clubTeamsTable.number))
      .get();
  }
}
