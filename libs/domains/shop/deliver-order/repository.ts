import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable } from '../shared/schema';

export class DeliverOrderRepository {
  async getOrderById(db: DbOrTx, id: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  /** Le verrou optimiste porte sur `paid` : deux remises concurrentes n'en font qu'une. */
  buildDeliverOrderStatement(db: DbOrTx, id: number, deliveredAt: string): any {
    return db.update(ordersTable)
      .set({ status: 'delivered', deliveredAt })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'paid')));
  }
}
