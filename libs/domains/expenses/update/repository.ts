import { eq, sql } from 'drizzle-orm';
import { expensesTable } from '../data-access/src/schema';

export class UpdateExpenseRepository {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
  }

  async update(db: any, id: number, values: {
    description?: string;
    category?: number;
    amount?: number;
    seasonId?: string;
    photoUrl?: string | null;
    emitterName?: string;
    memberId?: number | null;
  }): Promise<any> {
    return db.update(expensesTable).set(values).where(eq(expensesTable.id, id)).returning().get();
  }

  async approve(db: any, id: number, transactionId: number): Promise<any> {
    return db.update(expensesTable)
      .set({ status: 'approved', transactionId })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async reject(db: any, id: number): Promise<any> {
    return db.update(expensesTable)
      .set({ status: 'rejected' })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async cancelApproval(db: any, id: number): Promise<any> {
    return db.update(expensesTable)
      .set({ status: 'pending', transactionId: null })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async getTransactionDetails(db: any, txId: number): Promise<{ id: number; bankTransactionId: number | null; amount: number } | undefined> {
    return db.get(sql`
      SELECT id, bank_transaction_id as bankTransactionId, amount FROM transactions WHERE id = ${txId}
    `);
  }

  async getBankTransactionDetails(db: any, bankTxId: number): Promise<{ id: number; amount: number } | undefined> {
    return db.get(sql`
      SELECT id, amount FROM bank_transactions WHERE id = ${bankTxId}
    `);
  }

  async getRemainingTransactionsForBankTx(db: any, bankTxId: number, excludeTxId: number): Promise<{ id: number; amount: number }[]> {
    return db.all(sql`
      SELECT id, amount FROM transactions 
      WHERE bank_transaction_id = ${bankTxId} AND id != ${excludeTxId}
    `);
  }

  async resetBankTransactionStatus(db: any, bankTxId: number): Promise<void> {
    await db.run(sql`
      UPDATE bank_transactions SET status = 'pending' WHERE id = ${bankTxId}
    `);
  }

  async deleteTransaction(db: any, txId: number): Promise<void> {
    await db.run(sql`DELETE FROM transactions WHERE id = ${txId}`);
  }

  async insertTransaction(db: any, values: {
    seasonId: string;
    category: number;
    amount: number;
    emitterName: string;
    description: string;
    memberId: number | null;
  }): Promise<{ id: number }> {
    const today = new Date().toISOString().split('T')[0];
    return db.get(sql`
      INSERT INTO transactions (season_id, type, account_id, category, amount, date, payment_method, description, member_id, created_at)
      VALUES (${values.seasonId}, 'depense', 'current', ${values.category}, ${values.amount}, ${today}, 'virement', ${`Remboursement frais - ${values.emitterName} - ${values.description}`}, ${values.memberId}, ${new Date().getTime()})
      RETURNING id
    `) as Promise<{ id: number }>;
  }
}
