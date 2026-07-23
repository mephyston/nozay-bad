import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@metacult/shared-db';
import { productsTable } from '../shared/schema';

export class ListProductsRepository {
  async list(db: DbOrTx, filters: { category?: string; active?: boolean }): Promise<(typeof productsTable.$inferSelect)[]> {
    const conditions = [];
    if (filters.category) conditions.push(eq(productsTable.category, filters.category as any));
    if (filters.active !== undefined) conditions.push(eq(productsTable.active, filters.active));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(productsTable).where(whereClause).all();
  }
}
