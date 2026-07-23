import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@metacult/shared-db';
import { membersTable } from '../shared/schema';

export class ApplyPaymentRepository {
  async getById(db: DbOrTx, id: number): Promise<typeof membersTable.$inferSelect | undefined> {
    return db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  }

  async updatePayment(db: DbOrTx, id: number, values: { amountReceived: number; amountRemaining: number; paid: boolean }): Promise<void> {
    await db.update(membersTable)
      .set(values)
      .where(eq(membersTable.id, id))
      .run();
  }
}
