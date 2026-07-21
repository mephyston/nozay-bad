import { and, eq } from 'drizzle-orm';
import { ordersTable } from '../shared/schema';

export class RejectOrderRepository {
  async getOrderById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  async rejectWithLock(db: any, id: number): Promise<any | undefined> {
    return db.update(ordersTable)
      .set({ status: 'rejected' })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'pending')))
      .returning().get();
  }
}
