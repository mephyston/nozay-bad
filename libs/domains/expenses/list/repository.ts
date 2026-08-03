import { getSeasonId } from '@nba/accounting-api';
import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expensesTable } from '../shared/schema';

export class ListExpensesRepository {
  async list(db: DbOrTx, filters: { season?: string; status?: string; memberId?: number }): Promise<(typeof expensesTable.$inferSelect)[]> {
    const conditions = [];
    if (filters.memberId) conditions.push(eq(expensesTable.memberId, filters.memberId));
    if (filters.season) {
      const sId = await getSeasonId(db, filters.season);
      if (sId !== undefined) {
        conditions.push(eq(expensesTable.seasonId, sId));
      } else {
        return [];
      }
    }
    if (filters.status) conditions.push(eq(expensesTable.status, filters.status as 'pending' | 'approved' | 'rejected'));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(expensesTable).where(whereClause).all();
  }
}

