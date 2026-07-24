import { type DbOrTx } from '@nba/db';
import { eq, and, gte, lte, or, inArray } from 'drizzle-orm';
import { seasonBalancesTable, transactionsTable, categoriesTable, seasonCategoryBudgetsTable, accountsTable } from '../../shared/schema';


export class GetSeasonReportsRepository {
  async getBalances(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const numericId = Number(seasonId);
    const cond = !isNaN(numericId)
      ? or(eq(seasonBalancesTable.seasonId, numericId), eq(seasonBalancesTable.seasonId, seasonId as any))
      : eq(seasonBalancesTable.seasonId, seasonId as any);
    return db.select().from(seasonBalancesTable).where(cond).all();
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

  async getTransactionsForSeason(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const numericId = Number(seasonId);
    const cond = !isNaN(numericId)
      ? or(eq(transactionsTable.seasonId, numericId), eq(transactionsTable.seasonId, seasonId as any))
      : eq(transactionsTable.seasonId, seasonId as any);
    return db.select().from(transactionsTable).where(cond).all();
  }

  async getTransitCategory(db: DbOrTx): Promise<any> {
    return db.select().from(categoriesTable).where(eq(categoriesTable.code, 'virements_internes')).get();
  }

  async getDeferredTransactions(db: DbOrTx, cutoffDate: string): Promise<any[]> {
    return db.select()
      .from(transactionsTable)
      .where(and(
        lte(transactionsTable.date, cutoffDate),
        inArray(transactionsTable.accrualType, ['produit_constate_avance', 'charge_constatee_avance'])
      ))
      .all();
  }

  async getCategoryBudgets(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const numericId = Number(seasonId);
    const cond = !isNaN(numericId)
      ? or(eq(seasonCategoryBudgetsTable.seasonId, numericId), eq(seasonCategoryBudgetsTable.seasonId, seasonId as any))
      : eq(seasonCategoryBudgetsTable.seasonId, seasonId as any);
    return db.select().from(seasonCategoryBudgetsTable).where(cond).all();
  }

  async getAllCategories(db: DbOrTx): Promise<any[]> {
    return db.select().from(categoriesTable).all();
  }

  async getAccounts(db: DbOrTx): Promise<any[]> {
    return db.select().from(accountsTable).all();
  }
}

