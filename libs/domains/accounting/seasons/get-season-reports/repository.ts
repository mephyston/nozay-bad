import { ledgerEntriesTable, categoriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq, and, gte, lte, or, inArray } from 'drizzle-orm';
import { seasonBalancesTable, seasonCategoryBudgetsTable, accountsTable } from '../../shared/schema';


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
      .from(ledgerEntriesTable)
      .where(and(
        gte(ledgerEntriesTable.date, startDate),
        lte(ledgerEntriesTable.date, endDate)
      ))
      .all();
  }

  async getTransactionsForSeason(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const numericId = Number(seasonId);
    const cond = !isNaN(numericId)
      ? or(eq(ledgerEntriesTable.seasonId, numericId), eq(ledgerEntriesTable.seasonId, seasonId as any))
      : eq(ledgerEntriesTable.seasonId, seasonId as any);
    return db.select().from(ledgerEntriesTable).where(cond).all();
  }


  async getDeferredTransactions(db: DbOrTx, cutoffDate: string): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(and(
        lte(ledgerEntriesTable.date, cutoffDate),
        inArray(ledgerEntriesTable.accrualType, ['produit_constate_avance', 'charge_constatee_avance'])
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

