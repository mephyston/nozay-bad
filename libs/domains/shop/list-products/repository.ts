import { eq, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { productsTable, productCategoriesTable } from '../shared/schema';

export class ListProductsRepository {
  async list(db: DbOrTx, filters: { productCategoryId?: number; active?: boolean }) {
    const conditions = [];
    if (filters.productCategoryId) conditions.push(eq(productsTable.productCategoryId, filters.productCategoryId));
    if (filters.active !== undefined) conditions.push(eq(productsTable.active, filters.active));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        productCategoryId: productsTable.productCategoryId,
        priceCents: productsTable.priceCents,
        stock: productsTable.stock,
        active: productsTable.active,
        createdAt: productsTable.createdAt,
        categoryLabel: productCategoriesTable.label
      })
      .from(productsTable)
      .leftJoin(productCategoriesTable, eq(productsTable.productCategoryId, productCategoriesTable.id))
      .where(whereClause)
      .all();
  }
}
