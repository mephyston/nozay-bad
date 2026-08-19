import { and, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable, productsTable } from '../shared/schema';
import { getMemberById } from '@nba/members-api';

export class ValidateOrderRepository {
  async getOrderById(db: DbOrTx, id: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  async getProductById(db: DbOrTx, id: number): Promise<typeof productsTable.$inferSelect | undefined> {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  }

  async getMemberById(db: DbOrTx, id: number): Promise<{ id: number } | undefined> {
    const member = await getMemberById(db, id);
    return member ? { id: member.id } : undefined;
  }

  /**
   * Verrou optimiste : la mise à jour ne mord que si la commande est toujours
   * `created`. Deux validations concurrentes ne réservent ainsi le stock qu'une fois.
   */
  buildValidateOrderStatement(db: DbOrTx, id: number, awaitingPaymentSince: string): any {
    return db.update(ordersTable)
      .set({ status: 'awaiting_payment', awaitingPaymentSince })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'created')));
  }

  buildDecrementStockStatement(db: DbOrTx, productId: number, quantity: number): any {
    return db.update(productsTable)
      .set({ stock: sql`${productsTable.stock} - ${quantity}` })
      .where(eq(productsTable.id, productId));
  }
}
