import { type DbOrTx } from '@nba/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { seasonBalancesTable, ledgerEntriesTable } from '../../shared/schema';

export class GetSeasonBalanceRepository {
  async getBalances(db: DbOrTx, seasonId: string): Promise<any[]> {
    return db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  }

  async getTransactionsForPeriod(db: DbOrTx, startDate: string, endDate: string): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(and(
        gte(ledgerEntriesTable.date, startDate),
        lte(ledgerEntriesTable.date, endDate)
      ))
      .all();
  }
}
