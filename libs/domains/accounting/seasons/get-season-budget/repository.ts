import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { seasonCategoryBudgetsTable } from '../../shared/schema';

export class GetSeasonBudgetRepository {
  async getBudget(db: DbOrTx, seasonId: string): Promise<any[]> {
    return db.select().from(seasonCategoryBudgetsTable).where(eq(seasonCategoryBudgetsTable.seasonId, seasonId)).all();
  }
}
