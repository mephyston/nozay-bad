import type { Db } from '@nba/db';
import { productCategoriesTable, productsTable } from '../shared/schema';
import { eq } from 'drizzle-orm';

export async function listProductCategories(db: Db) {
  return db.select().from(productCategoriesTable).all();
}

export async function createProductCategory(
  db: Db,
  data: { label: string; accountingCategoryId: number; active?: boolean }
) {
  const result = await db.insert(productCategoriesTable).values({
    label: data.label,
    accountingCategoryId: data.accountingCategoryId,
    active: data.active ?? true,
    createdAt: new Date(),
  }).returning().get();
  return result;
}

export async function updateProductCategory(
  db: Db,
  id: number,
  data: { label?: string; accountingCategoryId?: number; active?: boolean }
) {
  const updates: any = {};
  if (data.label !== undefined) updates.label = data.label;
  if (data.accountingCategoryId !== undefined) updates.accountingCategoryId = data.accountingCategoryId;
  if (data.active !== undefined) updates.active = data.active;
  
  if (Object.keys(updates).length === 0) return null;

  return db.update(productCategoriesTable)
    .set(updates)
    .where(eq(productCategoriesTable.id, id))
    .returning().get();
}

export async function deleteProductCategory(db: Db, id: number) {
  const attachedProducts = await db.select().from(productsTable).where(eq(productsTable.productCategoryId, id)).limit(1).all();
  if (attachedProducts.length > 0) {
    throw new Error('Cette catégorie est rattachée à un ou plusieurs produits et ne peut pas être supprimée.');
  }
  return db.delete(productCategoriesTable).where(eq(productCategoriesTable.id, id)).run();
}
