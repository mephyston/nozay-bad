import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { productsTable } from '../shared/schema';

export class ListProductsRepository {
  async list(db: DbOrTx, filters: { productCategoryId?: number; active?: boolean }): Promise<(typeof productsTable.$inferSelect)[]> {
    const conditions = [];
    if (filters.productCategoryId) conditions.push(eq(productsTable.productCategoryId, filters.productCategoryId));
    if (filters.active !== undefined) conditions.push(eq(productsTable.active, filters.active));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(productsTable).where(whereClause).all();
  }
}
