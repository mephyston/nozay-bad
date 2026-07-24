import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { membersTable, seasonsTable } from '../shared/schema';

export class GetMemberRepository {
  async getByLicence(db: DbOrTx, licence: string, season?: string): Promise<typeof membersTable.$inferSelect | undefined> {
    const conditions = [eq(membersTable.licence, licence)];
    if (season) {
      const num = Number(season);
      if (!isNaN(num)) {
        conditions.push(eq(membersTable.seasonId, num));
      } else {
        const s = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, season)).get();
        if (s) conditions.push(eq(membersTable.seasonId, s.id));
      }
    }
    return db.select().from(membersTable).where(and(...conditions)).get();
  }
}
