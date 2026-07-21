import { eq } from 'drizzle-orm';
import { membersTable } from '../shared/schema';

export class ApplyPaymentRepository {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  }

  async updatePayment(db: any, id: number, values: { amountReceived: number; amountRemaining: number; paid: boolean }): Promise<void> {
    await db.update(membersTable)
      .set(values)
      .where(eq(membersTable.id, id))
      .run();
  }
}
