import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expensesTable, seasonsTable } from '../shared/schema';

export class ListExpensesRepository {
  async list(db: DbOrTx, filters: { season?: string; status?: string }): Promise<(typeof expensesTable.$inferSelect)[]> {
    const conditions = [];
    if (filters.season) {
      const num = Number(filters.season);
      if (!isNaN(num) && Number.isInteger(num)) {
        conditions.push(eq(expensesTable.seasonId, num));
      } else {
        const season = await db.select({ id: seasonsTable.id })
          .from(seasonsTable)
          .where(eq(seasonsTable.code, filters.season))
          .get();
        if (season) {
          conditions.push(eq(expensesTable.seasonId, season.id));
        } else {
          return [];
        }
      }
    }
    if (filters.status) conditions.push(eq(expensesTable.status, filters.status as 'pending' | 'approved' | 'rejected'));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(expensesTable).where(whereClause).all();
  }
}

