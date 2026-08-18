import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubTeamsTable, type ClubTeamRow } from '../shared/schema';

export class NotifyCaptainRepository {
  async findTeam(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }
}
