import { type DbOrTx } from '@nba/db';
import { eq, and, ne, sql } from 'drizzle-orm';
import { ledgerEntriesTable, bankStatementLinesTable } from '../../shared/schema';

export class DeleteTransactionRepository {
  async getById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
  }

  async getBankStatementLineById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, id)).get();
  }

  async getRemainingTransactionsForBankTx(db: DbOrTx, bankTxId: number, excludeTxId: number): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(and(
        eq(ledgerEntriesTable.bankStatementLineId, bankTxId),
        ne(ledgerEntriesTable.id, excludeTxId)
      ))
      .all();
  }

  buildUpdateBankStatementLineStatusStatement(db: DbOrTx, id: number, status: any): any {
    return db.update(bankStatementLinesTable).set({ status }).where(eq(bankStatementLinesTable.id, id));
  }

  async resetExpenseStatusByTxId(db: DbOrTx, txId: number): Promise<void> {
    await db.run(sql`
      UPDATE expenses SET status = 'pending', ledger_entry_id = NULL WHERE ledger_entry_id = ${txId}
    `);
  }

  buildDeleteLedgerEntryStatement(db: DbOrTx, id: number): any {
    return db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id));
  }

  async updateBankStatementLineStatus(db: DbOrTx, id: number, status: any): Promise<void> {
    await db.update(bankStatementLinesTable).set({ status }).where(eq(bankStatementLinesTable.id, id)).run();
  }

  async delete(db: DbOrTx, id: number): Promise<void> {
    await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).run();
  }
}
