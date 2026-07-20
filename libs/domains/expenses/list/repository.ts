import { eq, and } from 'drizzle-orm';
import { expensesTable } from '../data-access/src/schema';

export class ListExpensesRepository {
  async list(db: any, filters: { season?: string; status?: string }): Promise<any[]> {
    const conditions = [];
    if (filters.season) conditions.push(eq(expensesTable.seasonId, filters.season));
    if (filters.status) conditions.push(eq(expensesTable.status, filters.status as any));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(expensesTable).where(whereClause).all();
  }
}
