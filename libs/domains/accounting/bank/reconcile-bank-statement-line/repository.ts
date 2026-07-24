import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import {
  ledgerEntriesTable,
  bankStatementLinesTable,
  invoicesTable,
  seasonsTable
} from '../../shared/schema';

export class ReconcileBankStatementLineRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }
  async getBankStatementLineById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, id)).get();
  }

  async getInvoiceById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async getTransactionById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
  }

  buildLinkTransactionToBankStatement(db: DbOrTx, ledgerEntryId: number, bankStatementLineId: number, memberId?: number): any {
    return db.update(ledgerEntriesTable)
      .set({ 
        bankStatementLineId,
        memberId: memberId || undefined
      })
      .where(eq(ledgerEntriesTable.id, ledgerEntryId));
  }

  buildCreateLedgerEntryStatement(db: DbOrTx, values: any): any {
    return db.insert(ledgerEntriesTable).values({
      seasonId: typeof values.seasonId === 'number' ? values.seasonId : Number(values.seasonId),
      type: values.type,
      accountId: typeof values.accountId === 'number' ? values.accountId : (Number(values.accountId) || 1),
      destinationAccountId: values.destinationAccountId ? Number(values.destinationAccountId) : null,
      categoryId: values.categoryId ?? values.category ?? null,
      amountCents: values.amountCents ?? (values.amount !== undefined ? Math.round(values.amount) : 0),
      date: values.date,
      paymentMethodId: typeof values.paymentMethodId === 'number' ? values.paymentMethodId : (typeof values.paymentMethod === 'number' ? values.paymentMethod : (Number(values.paymentMethod) || 1)),
      description: values.description,
      reference: values.reference || null,
      accrualType: values.accrualType || 'normal',
      accrualNote: values.accrualNote || null,
      memberId: values.memberId || null,
      invoiceId: values.invoiceId || null,
      bankStatementLineId: values.bankStatementLineId || null,
      createdAt: values.createdAt || new Date()
    });
  }

  buildMarkInvoiceAsPaidStatement(db: DbOrTx, id: number, bankStatementLineId: number): any {
    return db.update(invoicesTable)
      .set({ status: 'paid', bankStatementLineId })
      .where(eq(invoicesTable.id, id));
  }

  buildMarkBankStatementLineReconciledStatement(db: DbOrTx, id: number): any {
    return db.update(bankStatementLinesTable)
      .set({ status: 'reconciled' })
      .where(eq(bankStatementLinesTable.id, id));
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

  async createLedgerEntry(db: DbOrTx, values: any): Promise<any> {
    return db.insert(ledgerEntriesTable).values(values).returning().get();
  }

  async markInvoiceAsPaid(db: DbOrTx, id: number, bankStatementLineId: number): Promise<void> {
    await db.update(invoicesTable)
      .set({ status: 'paid', bankStatementLineId })
      .where(eq(invoicesTable.id, id))
      .run();
  }

  async getLedgerEntriesForBankStatementLine(db: DbOrTx, bankStatementLineId: number): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(eq(ledgerEntriesTable.bankStatementLineId, bankStatementLineId))
      .all();
  }

  async markBankStatementLineReconciled(db: DbOrTx, id: number): Promise<void> {
    await db.update(bankStatementLinesTable)
      .set({ status: 'reconciled' })
      .where(eq(bankStatementLinesTable.id, id))
      .run();
  }
}
