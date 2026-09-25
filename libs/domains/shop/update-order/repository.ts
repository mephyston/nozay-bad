import { and, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable, productsTable } from '../shared/schema';
import { getMemberById } from '@nba/members-api';
import { getPaymentMethodByCode as getAccountingPaymentMethodByCode } from '@nba/accounting-api';
import type { OrderStatus } from '../shared/order';

export class UpdateOrderRepository {
  async getOrderById(db: DbOrTx, id: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  async getProductById(db: DbOrTx, id: number): Promise<typeof productsTable.$inferSelect | undefined> {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  }

  /** Un parent à déclinaisons ne se commande pas : c'est l'une d'elles que la commande vise. */
  async hasVariants(db: DbOrTx, productId: number): Promise<boolean> {
    const row = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.parentId, productId))
      .limit(1)
      .get();
    return !!row;
  }

  async getMemberById(db: DbOrTx, id: number): Promise<any> {
    return getMemberById(db, id);
  }

  async getPaymentMethodByCode(db: DbOrTx, code: string) {
    return getAccountingPaymentMethodByCode(db, code);
  }

  /**
   * Verrou optimiste : la mise à jour ne mord que si la commande est toujours dans l'état
   * lu. Une validation, un refus ou un encaissement passé entre-temps la laisse intacte — et
   * le stock avec elle, puisque les deux partent dans le même lot.
   */
  buildUpdateOrderStatement(
    db: DbOrTx,
    id: number,
    expectedStatus: OrderStatus,
    values: Pick<typeof ordersTable.$inferInsert, 'memberId' | 'productId' | 'quantity' | 'totalAmountCents' | 'paymentMethodId'>
  ): any {
    return db
      .update(ordersTable)
      .set(values)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, expectedStatus)));
  }

  /** Ajoute (positif) ou retire (négatif) au stock d'un article. */
  buildAdjustStockStatement(db: DbOrTx, productId: number, delta: number): any {
    return db
      .update(productsTable)
      .set({ stock: sql`${productsTable.stock} + ${delta}` })
      .where(eq(productsTable.id, productId));
  }
}
