import { eq } from 'drizzle-orm';
import { seasonCategoryBudgetsTable } from '../../data-access/src/schema';

export class UpdateSeasonBudgetRepository {
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
}
