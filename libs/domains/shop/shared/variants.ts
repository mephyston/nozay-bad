import { eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { productsTable, ordersTable } from './schema';
import { ParentProductNotFoundError, VariantLabelRequiredError, VariantNestingError } from './errors';

/**
 * Les règles d'une déclinaison, partagées par la création et la modification.
 *
 * Un seul niveau : un parent n'est jamais lui-même une déclinaison, et un produit qui
 * en a ne peut pas en devenir une. Ce que la déclinaison hérite — nom, catégorie —
 * lui est recopié, pour que tout ce qui lit un produit par son identifiant (commande,
 * notification, écriture) y trouve un nom sans jointure.
 */
export interface ParentProduct {
  id: number;
  name: string;
  productCategoryId: number;
}

export async function resolveParent(db: DbOrTx, parentId: number): Promise<ParentProduct> {
  const parent = await db
    .select({ id: productsTable.id, name: productsTable.name, productCategoryId: productsTable.productCategoryId, parentId: productsTable.parentId })
    .from(productsTable)
    .where(eq(productsTable.id, parentId))
    .get();
  if (!parent) throw new ParentProductNotFoundError();
  if (parent.parentId !== null) throw new VariantNestingError();
  return { id: parent.id, name: parent.name, productCategoryId: parent.productCategoryId };
}

/** Le libellé, nettoyé ; sans lui, une déclinaison serait indiscernable de ses sœurs. */
export function requireVariantLabel(label: string | null | undefined): string {
  const trimmed = label?.trim() ?? '';
  if (!trimmed) throw new VariantLabelRequiredError();
  return trimmed;
}

export async function hasVariants(db: DbOrTx, productId: number): Promise<boolean> {
  const row = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.parentId, productId)).limit(1).get();
  return row !== undefined;
}

export async function hasOrders(db: DbOrTx, productId: number): Promise<boolean> {
  const row = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.productId, productId)).limit(1).get();
  return row !== undefined;
}

/** Ce que les déclinaisons héritent du parent, répercuté quand il change. */
export async function propagateToVariants(
  db: DbOrTx,
  parentId: number,
  values: { name?: string; productCategoryId?: number }
): Promise<void> {
  if (values.name === undefined && values.productCategoryId === undefined) return;
  await db.update(productsTable).set(values).where(eq(productsTable.parentId, parentId)).run();
}

/** Nombre de commandes par produit, en une requête — pour dire à l'écran ce qui se supprime encore. */
export const ordersCountSql = sql<number>`(select count(*) from ${ordersTable} where ${ordersTable.productId} = ${productsTable.id})`;

/**
 * Nombre de déclinaisons par produit, actives ou non.
 *
 * Compté en base et non dans la liste rendue : filtrée sur les actifs, celle-ci ne
 * verrait plus les déclinaisons désactivées, et un parent dont toutes les tailles sont
 * retirées passerait pour un produit à part entière, commandable à son propre prix.
 */
export const variantCountSql = sql<number>`(select count(*) from ${productsTable} as v where v.parent_id = ${productsTable.id})`;
