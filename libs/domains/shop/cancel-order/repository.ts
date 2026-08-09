import { and, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable, productsTable } from '../shared/schema';

export class CancelOrderRepository {
  async getOrderById(db: DbOrTx, id: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  async getProductById(db: DbOrTx, id: number): Promise<typeof productsTable.$inferSelect | undefined> {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  }

  buildCancelOrderStatement(db: DbOrTx, id: number): any {
    return db.update(ordersTable)
      .set({ status: 'cancelled', awaitingPaymentSince: null })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'awaiting_payment')));
  }

  /** Rend au stock l'unité réservée par la validation. */
  buildRestoreStockStatement(db: DbOrTx, productId: number, quantity: number): any {
    return db.update(productsTable)
      .set({ stock: sql`${productsTable.stock} + ${quantity}` })
      .where(eq(productsTable.id, productId));
  }
}
