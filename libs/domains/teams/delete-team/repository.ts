import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubTeamsTable, type ClubTeamRow } from '../shared/schema';

export class DeleteTeamRepository {
  async findById(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  /**
   * Le staff, l'effectif, les rencontres et leurs compositions partent avec l'équipe :
   * les clés étrangères portent `ON DELETE CASCADE`. Rien ne survit à une équipe
   * supprimée, et rien n'a de sens sans elle.
   */
  async remove(db: DbOrTx, id: number): Promise<void> {
    await db.delete(clubTeamsTable).where(eq(clubTeamsTable.id, id));
  }
}
