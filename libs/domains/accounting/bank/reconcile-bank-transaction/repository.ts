import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import {
  ledgerEntriesTable,
  bankStatementLinesTable,
  invoicesTable,
} from '../../shared/schema';

export class ReconcileBankTransactionRepository {
  async getBankTransactionById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, id)).get();
  }

  async getInvoiceById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async getTransactionById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
  }

  async linkTransactionToBank(db: DbOrTx, ledgerEntryId: number, bankStatementLineId: number, memberId?: number): Promise<void> {
    await db.update(ledgerEntriesTable)
      .set({ 
        bankStatementLineId,
        memberId: memberId || undefined
      })
      .where(eq(ledgerEntriesTable.id, ledgerEntryId))
      .run();
  }

  async createTransaction(db: DbOrTx, values: any): Promise<any> {
    return db.insert(ledgerEntriesTable).values(values).returning().get();
  }

  async markInvoiceAsPaid(db: DbOrTx, id: number, bankStatementLineId: number): Promise<void> {
    await db.update(invoicesTable)
      .set({ status: 'paid', bankStatementLineId })
      .where(eq(invoicesTable.id, id))
      .run();
  }

  async getTransactionsForBankTransaction(db: DbOrTx, bankStatementLineId: number): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(eq(ledgerEntriesTable.bankStatementLineId, bankStatementLineId))
      .all();
  }

  async markBankTransactionReconciled(db: DbOrTx, id: number): Promise<void> {
    await db.update(bankStatementLinesTable)
      .set({ status: 'reconciled' })
      .where(eq(bankStatementLinesTable.id, id))
      .run();
  }
}
