import { eq } from 'drizzle-orm';
import { seasonCategoryBudgetsTable } from '../../data-access/src/schema';

export class GetSeasonBudgetRepository {
  async getBudget(db: any, seasonId: string): Promise<any[]> {
    return db.select().from(seasonCategoryBudgetsTable).where(eq(seasonCategoryBudgetsTable.seasonId, seasonId)).all();
  }
}
