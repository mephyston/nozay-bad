import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable } from '../shared/schema';

export class UndeliverOrderRepository {
  async getOrderById(db: DbOrTx, id: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  buildUndeliverOrderStatement(db: DbOrTx, id: number): any {
    return db.update(ordersTable)
      .set({ status: 'paid', deliveredAt: null })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'delivered')));
  }
}
