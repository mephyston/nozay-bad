import { eq } from 'drizzle-orm';
import { bankTransactionsTable } from '../../data-access/src/schema';

export class UpdateBankTransactionStatusRepository {
  async updateStatus(db: any, id: number, status: 'pending' | 'ignored'): Promise<void> {
    await db.update(bankTransactionsTable)
      .set({ status })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  }
}
