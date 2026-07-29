import { membersTable } from '@nba/members/schema';
import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { getSeasonId } from '@nba/accounting-api';


export class GetMemberRepository {
  async getByLicence(db: DbOrTx, licence: string, season?: string): Promise<typeof membersTable.$inferSelect | undefined> {
    const conditions = [eq(membersTable.licence, licence)];
    if (season) {
      const sId = await getSeasonId(db, season);
      if (sId !== undefined) conditions.push(eq(membersTable.seasonId, sId));
    }
    return db.select().from(membersTable).where(and(...conditions)).get();
  }
}
