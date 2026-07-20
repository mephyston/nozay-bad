import { eq, ne, desc, and, gte, lte } from 'drizzle-orm';
import { seasonsTable } from '@metacult/features-members-data-access';
import {
  seasonBalancesTable,
  transactionsTable,
  categoriesTable,
  seasonCategoryBudgetsTable,
} from '../data-access/src/schema';

export class SeasonsRepository {
  async listSeasons(db: any): Promise<any[]> {
    return db.select().from(seasonsTable).orderBy(desc(seasonsTable.id)).all();
  }

  async getSeasonById(db: any, id: string): Promise<any | undefined> {
    return db.select().from(seasonsTable).where(eq(seasonsTable.id, id)).get();
  }

  async createSeason(db: any, values: {
    id: string;
    name: string;
    active: boolean;
    createdAt: Date;
  }): Promise<any> {
    return db.insert(seasonsTable).values(values).returning().get();
  }

  async deactivateAllSeasonsExcept(db: any, activeId?: string): Promise<void> {
    const whereClause = activeId ? ne(seasonsTable.id, activeId) : undefined;
    await db.update(seasonsTable).set({ active: false }).where(whereClause).run();
  }

  async updateSeason(db: any, id: string, values: {
    name?: string;
    active?: boolean;
    closed?: boolean;
  }): Promise<any | undefined> {
    return db.update(seasonsTable).set(values).where(eq(seasonsTable.id, id)).returning().get();
  }

  async getBudget(db: any, seasonId: string): Promise<any[]> {
    return db.select().from(seasonCategoryBudgetsTable).where(eq(seasonCategoryBudgetsTable.seasonId, seasonId)).all();
  }

  async updateBudget(db: any, seasonId: string, items: { categoryId: number; type: 'recette' | 'depense'; amount: number }[]): Promise<any[]> {
    await db.delete(seasonCategoryBudgetsTable).where(eq(seasonCategoryBudgetsTable.seasonId, seasonId)).run();
    const inserted = [];
    for (const item of items) {
      if (item.categoryId) {
        const entry = await db.insert(seasonCategoryBudgetsTable).values({
          seasonId,
          categoryId: item.categoryId,
          type: item.type,
          amount: Math.round(item.amount),
          createdAt: new Date()
        }).returning().get();
        inserted.push(entry);
      }
    }
    return inserted;
  }

  async getBalances(db: any, seasonId: string): Promise<any[]> {
    return db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
  }

  async updateBalances(db: any, seasonId: string, balances: { accountId: 'current' | 'savings' | 'cash'; initialBalance: number }[]): Promise<void> {
    for (const item of balances) {
      await db.insert(seasonBalancesTable)
        .values({
          seasonId,
          accountId: item.accountId,
          initialBalance: item.initialBalance,
          createdAt: new Date()
        })
        .onConflictDoUpdate({
          target: [seasonBalancesTable.seasonId, seasonBalancesTable.accountId],
          set: { initialBalance: item.initialBalance }
        })
        .run();
    }
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

  async getTransactionsForSeason(db: any, seasonId: string): Promise<any[]> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.seasonId, seasonId)).all();
  }

  async getTransitCategory(db: any): Promise<any> {
    return db.select().from(categoriesTable).where(eq(categoriesTable.adminLabel, 'Virements Internes (Transit)')).get();
  }
}
