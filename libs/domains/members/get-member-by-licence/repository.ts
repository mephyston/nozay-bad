import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { membersTable } from '../shared/schema';

export class GetMemberRepository {
  async getByLicence(db: DbOrTx, licence: string, season?: string): Promise<typeof membersTable.$inferSelect | undefined> {
    const conditions = [eq(membersTable.licence, licence)];
    if (season) {
      conditions.push(eq(membersTable.season, season));
    }
    return db.select().from(membersTable).where(and(...conditions)).get();
  }
}
