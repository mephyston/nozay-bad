import { seasonsTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { seasonCategoryBudgetsTable } from '../../shared/schema';

export class UpdateSeasonBudgetRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async updateBudget(db: DbOrTx, seasonId: string | number, items: { categoryId: number; type: 'recette' | 'depense'; amount: number }[]): Promise<any[]> {
    const seasonIdInt = await this.resolveSeasonId(db, seasonId);
    await db.delete(seasonCategoryBudgetsTable).where(eq(seasonCategoryBudgetsTable.seasonId, seasonIdInt)).run();
    const inserted = [];
    for (const item of items) {
      if (item.categoryId) {
        const entry = await db.insert(seasonCategoryBudgetsTable).values({
          seasonId: seasonIdInt,
          categoryId: item.categoryId,
          type: item.type,
          amountCents: Math.round(item.amount),
          createdAt: new Date()
        }).returning().get();
        inserted.push(entry);
      }
    }
    return inserted;
  }
}
