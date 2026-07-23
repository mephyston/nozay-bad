import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@metacult/shared-db';
import { expensesTable } from '../shared/schema';

export class ListExpensesRepository {
  async list(db: DbOrTx, filters: { season?: string; status?: string }): Promise<(typeof expensesTable.$inferSelect)[]> {
    const conditions = [];
    if (filters.season) conditions.push(eq(expensesTable.seasonId, filters.season));
    if (filters.status) conditions.push(eq(expensesTable.status, filters.status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(expensesTable).where(whereClause).all();
  }
}
