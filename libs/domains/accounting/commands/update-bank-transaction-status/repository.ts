import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { bankTransactionsTable } from '../../shared/schema';

export class UpdateBankTransactionStatusRepository {
  async updateStatus(db: DbOrTx, id: number, status: 'pending' | 'ignored'): Promise<void> {
    await db.update(bankTransactionsTable)
      .set({ status })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  }
}
