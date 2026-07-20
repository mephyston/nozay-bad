import { eq, and } from 'drizzle-orm';
import { membersTable } from '../data-access/src/schema';
import { GetMemberRepositoryInterface } from '../shared/repository';

export class GetMemberRepository implements GetMemberRepositoryInterface {
  async getByLicence(db: any, licence: string, season?: string): Promise<any | undefined> {
    const conditions = [eq(membersTable.licence, licence)];
    if (season) {
      conditions.push(eq(membersTable.season, season));
    }
    return db.select().from(membersTable).where(and(...conditions)).get();
  }
}
