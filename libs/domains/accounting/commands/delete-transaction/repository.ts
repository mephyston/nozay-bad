import { type DbOrTx } from '@metacult/shared-db';
import { eq, and, ne, sql } from 'drizzle-orm';
import { transactionsTable, bankTransactionsTable } from '../../shared/schema';

export class DeleteTransactionRepository {
  async getById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  }

  async getBankTransactionById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, id)).get();
  }

  async getRemainingTransactionsForBankTx(db: DbOrTx, bankTxId: number, excludeTxId: number): Promise<any[]> {
    return db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.bankTransactionId, bankTxId),
        ne(transactionsTable.id, excludeTxId)
      ))
      .all();
  }

  async updateBankTransactionStatus(db: DbOrTx, id: number, status: string): Promise<void> {
    await db.update(bankTransactionsTable).set({ status }).where(eq(bankTransactionsTable.id, id)).run();
  }

  async resetExpenseStatusByTxId(db: DbOrTx, txId: number): Promise<void> {
    await db.run(sql`
      UPDATE expenses SET status = 'pending', transaction_id = NULL WHERE transaction_id = ${txId}
    `);
  }

  async delete(db: DbOrTx, id: number): Promise<void> {
    await db.delete(transactionsTable).where(eq(transactionsTable.id, id)).run();
  }
}
