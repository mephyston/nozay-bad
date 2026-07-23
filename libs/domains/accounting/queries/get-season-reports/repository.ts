import { type DbOrTx } from '@metacult/shared-db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { seasonBalancesTable, transactionsTable, categoriesTable } from '../../shared/schema';

export class GetSeasonReportsRepository {
  async getBalances(db: DbOrTx, seasonId: string): Promise<any[]> {
    return db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  }

  async getTransactionsForPeriod(db: DbOrTx, startDate: string, endDate: string): Promise<any[]> {
    return db.select()
      .from(transactionsTable)
      .where(and(
        gte(transactionsTable.date, startDate),
        lte(transactionsTable.date, endDate)
      ))
      .all();
  }

  async getTransactionsForSeason(db: DbOrTx, seasonId: string): Promise<any[]> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.seasonId, seasonId)).all();
  }

  async getTransitCategory(db: DbOrTx): Promise<any> {
    return db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Virements Internes (Transit)')).get();
  }
}
