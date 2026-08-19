import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { teamRosterTable } from '../shared/schema';

export class NotifyLineupRepository {
  async rosterOf(db: DbOrTx, teamId: number): Promise<string[]> {
    const rows = await db
      .select({ licence: teamRosterTable.licence })
      .from(teamRosterTable)
      .where(eq(teamRosterTable.teamId, teamId))
      .all();
    return rows.map((row) => row.licence);
  }
}
