import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable } from '../shared/schema';

export class RejectOrderRepository {
  async getOrderById(db: DbOrTx, id: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  async rejectWithLock(
    db: DbOrTx,
    id: number,
    reason: string | null
  ): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.update(ordersTable)
      .set({ status: 'rejected', rejectionReason: reason })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'created')))
      .returning().get();
  }
}
