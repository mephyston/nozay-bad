import { eq, and } from 'drizzle-orm';
import { productsTable } from '../data-access/src/schema';

export class ListProductsRepository {
  async list(db: any, filters: { category?: string; active?: boolean }): Promise<any[]> {
    const conditions = [];
    if (filters.category) conditions.push(eq(productsTable.category, filters.category as any));
    if (filters.active !== undefined) conditions.push(eq(productsTable.active, filters.active));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(productsTable).where(whereClause).all();
  }
}
