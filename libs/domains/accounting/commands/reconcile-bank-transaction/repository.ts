import { eq } from 'drizzle-orm';
import {
  transactionsTable,
  bankTransactionsTable,
  invoicesTable,
} from '../../shared/schema';

export class ReconcileBankTransactionRepository {
  async getBankTransactionById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, id)).get();
  }

  async getInvoiceById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async getTransactionById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  }

  async linkTransactionToBank(db: any, transactionId: number, bankTransactionId: number, memberId?: number): Promise<void> {
    await db.update(transactionsTable)
      .set({ 
        bankTransactionId,
        memberId: memberId || undefined
      })
      .where(eq(transactionsTable.id, transactionId))
      .run();
  }

  async createTransaction(db: any, values: any): Promise<any> {
    return db.insert(transactionsTable).values(values).returning().get();
  }

  async markInvoiceAsPaid(db: any, id: number, bankTransactionId: number): Promise<void> {
    await db.update(invoicesTable)
      .set({ status: 'paid', bankTransactionId })
      .where(eq(invoicesTable.id, id))
      .run();
  }

  async getTransactionsForBankTransaction(db: any, bankTransactionId: number): Promise<any[]> {
    return db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.bankTransactionId, bankTransactionId))
      .all();
  }

  async markBankTransactionReconciled(db: any, id: number): Promise<void> {
    await db.update(bankTransactionsTable)
      .set({ status: 'reconciled' })
      .where(eq(bankTransactionsTable.id, id))
      .run();
  }
}
