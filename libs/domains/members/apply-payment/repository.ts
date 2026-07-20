import { eq } from 'drizzle-orm';
import { membersTable } from '../data-access/src/schema';
import { ApplyPaymentRepositoryInterface } from '../shared/repository';

export class ApplyPaymentRepository implements ApplyPaymentRepositoryInterface {
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
