import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable } from '../shared/schema';

export class WithdrawOrderRepository {
  async getOrderById(db: DbOrTx, id: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  /** Le verrou optimiste porte sur `created` : validée entre-temps, la commande ne bouge pas. */
  buildWithdrawOrderStatement(db: DbOrTx, id: number): any {
    return db.update(ordersTable)
      .set({ status: 'cancelled' })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'created')));
  }
}
