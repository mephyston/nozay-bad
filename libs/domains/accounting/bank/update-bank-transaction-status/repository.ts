import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { bankStatementLinesTable } from '../../shared/schema';

export class UpdateBankTransactionStatusRepository {
  async updateStatus(db: DbOrTx, id: number, status: 'pending' | 'ignored'): Promise<void> {
    await db.update(bankStatementLinesTable)
      .set({ status })
      .where(eq(bankStatementLinesTable.id, id))
      .run();
  }
}
