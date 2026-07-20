import { eq, and, ne, sql } from 'drizzle-orm';
import { transactionsTable, bankTransactionsTable } from '../../data-access/src/schema';

export class DeleteTransactionRepository {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  }

  async getBankTransactionById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, id)).get();
  }

  async getRemainingTransactionsForBankTx(db: any, bankTxId: number, excludeTxId: number): Promise<any[]> {
    return db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.bankTransactionId, bankTxId),
        ne(transactionsTable.id, excludeTxId)
      ))
      .all();
  }

  async updateBankTransactionStatus(db: any, id: number, status: string): Promise<void> {
    await db.update(bankTransactionsTable).set({ status }).where(eq(bankTransactionsTable.id, id)).run();
  }

  async resetExpenseStatusByTxId(db: any, txId: number): Promise<void> {
    await db.run(sql`
      UPDATE expenses SET status = 'pending', transaction_id = NULL WHERE transaction_id = ${txId}
    `);
  }

  async delete(db: any, id: number): Promise<void> {
    await db.delete(transactionsTable).where(eq(transactionsTable.id, id)).run();
  }
}
