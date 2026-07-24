import { eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expensesTable } from '../shared/schema';

export class UpdateExpenseRepository {
  async getById(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect | undefined> {
    return db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
  }

  async update(db: DbOrTx, id: number, values: {
    description?: string;
    category?: number;
    amount?: number;
    seasonId?: string;
    photoUrl?: string | null;
    emitterName?: string;
    memberId?: number | null;
  }): Promise<typeof expensesTable.$inferSelect | undefined> {
    return db.update(expensesTable).set(values).where(eq(expensesTable.id, id)).returning().get();
  }

  async approve(db: DbOrTx, id: number, ledgerEntryId: number): Promise<typeof expensesTable.$inferSelect> {
    return db.update(expensesTable)
      .set({ status: 'approved', ledgerEntryId })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async reject(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect> {
    return db.update(expensesTable)
      .set({ status: 'rejected' })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async cancelApproval(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect> {
    return db.update(expensesTable)
      .set({ status: 'pending', ledgerEntryId: null })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async getTransactionDetails(db: DbOrTx, txId: number): Promise<{ id: number; bankStatementLineId: number | null; amount: number } | undefined> {
    return db.get(sql`
      SELECT id, bank_statement_line_id as bankStatementLineId, amount FROM transactions WHERE id = ${txId}
    `);
  }

  async getBankTransactionDetails(db: DbOrTx, bankTxId: number): Promise<{ id: number; amount: number } | undefined> {
    return db.get(sql`
      SELECT id, amount FROM bank_statement_lines WHERE id = ${bankTxId}
    `);
  }

  async getRemainingTransactionsForBankTx(db: DbOrTx, bankTxId: number, excludeTxId: number): Promise<{ id: number; amount: number }[]> {
    return db.all(sql`
      SELECT id, amount FROM transactions 
      WHERE bank_statement_line_id = ${bankTxId} AND id != ${excludeTxId}
    `);
  }

  async resetBankTransactionStatus(db: DbOrTx, bankTxId: number): Promise<void> {
    await db.run(sql`
      UPDATE bank_statement_lines SET status = 'pending' WHERE id = ${bankTxId}
    `);
  }

  async deleteLedgerEntry(db: DbOrTx, txId: number): Promise<void> {
    await db.run(sql`DELETE FROM transactions WHERE id = ${txId}`);
  }

  async insertTransaction(db: DbOrTx, values: {
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
