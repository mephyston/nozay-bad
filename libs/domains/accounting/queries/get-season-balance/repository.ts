import { eq, and, gte, lte } from 'drizzle-orm';
import { seasonBalancesTable, transactionsTable } from '../../shared/schema';

export class GetSeasonBalanceRepository {
  async getBalances(db: any, seasonId: string): Promise<any[]> {
    return db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  }

  async getTransactionsForPeriod(db: any, startDate: string, endDate: string): Promise<any[]> {
    return db.select()
      .from(transactionsTable)
      .where(and(
        gte(transactionsTable.date, startDate),
        lte(transactionsTable.date, endDate)
      ))
      .all();
  }
}
