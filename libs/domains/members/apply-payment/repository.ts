import { membersTable } from '@nba/members/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';


export class ApplyPaymentRepository {
  async getById(db: DbOrTx, id: number): Promise<typeof membersTable.$inferSelect | undefined> {
    return db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  }

  buildUpdatePaymentStatement(db: DbOrTx, id: number, values: { amountReceivedCents: number; amountRemainingCents: number; paid: boolean }): any {
    return db.update(membersTable)
      .set(values)
      .where(eq(membersTable.id, id));
  }

  async updatePayment(db: DbOrTx, id: number, values: { amountReceivedCents: number; amountRemainingCents: number; paid: boolean }): Promise<void> {
    await db.update(membersTable)
      .set(values)
      .where(eq(membersTable.id, id))
      .run();
  }
}
