import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { seasonBalancesTable } from '../../shared/schema';

export class GetSeasonBalancesRepository {
  async getBalances(db: DbOrTx, seasonId: string): Promise<any[]> {
    return db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  }
}
