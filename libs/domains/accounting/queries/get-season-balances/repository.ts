import { eq } from 'drizzle-orm';
import { seasonBalancesTable } from '../../data-access/src/schema';

export class GetSeasonBalancesRepository {
  async getBalances(db: any, seasonId: string): Promise<any[]> {
    return db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  }
}
