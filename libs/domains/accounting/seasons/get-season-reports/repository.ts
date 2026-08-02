import { ledgerEntriesTable, categoriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq, and, gte, lte, or, inArray, lt } from 'drizzle-orm';
import { seasonBalancesTable, seasonCategoryBudgetsTable, accountsTable, seasonsTable } from '../../shared/schema';


export class GetSeasonReportsRepository {
  async getBalances(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const numericId = Number(seasonId);
    const cond = !isNaN(numericId)
      ? or(eq(seasonBalancesTable.seasonId, numericId), eq(seasonBalancesTable.seasonId, seasonId as any))
      : eq(seasonBalancesTable.seasonId, seasonId as any);
    return db.select().from(seasonBalancesTable).where(cond).all();
  }

  async getAllBalances(db: DbOrTx): Promise<any[]> {
    return db.select().from(seasonBalancesTable).all();
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


  async getDeferredTransactions(db: DbOrTx, cutoffDate: string, seasonId: number | string): Promise<any[]> {
    const numericId = Number(seasonId);
    const seasonCond = !isNaN(numericId)
      ? or(eq(ledgerEntriesTable.seasonId, numericId), eq(ledgerEntriesTable.seasonId, seasonId as any))
      : eq(ledgerEntriesTable.seasonId, seasonId as any);

    return db.select()
      .from(ledgerEntriesTable)
      .where(and(
        lte(ledgerEntriesTable.date, cutoffDate),
        inArray(ledgerEntriesTable.accrualType, ['produit_constate_avance', 'charge_constatee_avance']),
        seasonCond
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

  async getPastSeasons(db: DbOrTx, currentSeasonStartDate: string): Promise<any[]> {
    return db.select()
      .from(seasonsTable)
      .where(lt(seasonsTable.startDate, currentSeasonStartDate))
      .all();
  }

  async getPastTransactions(db: DbOrTx, currentSeasonStartDate: string): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(lt(ledgerEntriesTable.date, currentSeasonStartDate))
      .all();
  }
}

