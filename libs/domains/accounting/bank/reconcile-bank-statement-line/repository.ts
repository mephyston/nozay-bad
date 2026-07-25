import { type DbOrTx } from '@nba/db';
import { eq, and, lte, gte } from 'drizzle-orm';
import {
  ledgerEntriesTable,
  bankStatementLinesTable,
  invoicesTable,
  seasonsTable
} from '../../shared/schema';

export class ReconcileBankStatementLineRepository {
  async getSeasonIdByDate(db: DbOrTx, date: string): Promise<number | undefined> {
    if (!date) return undefined;
    const row = await db.select({ id: seasonsTable.id })
      .from(seasonsTable)
      .where(and(lte(seasonsTable.startDate, date), gte(seasonsTable.endDate, date)))
      .get();
    return row?.id;
  }

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
    const accountMap: Record<string, number> = { current: 1, savings: 2, cash: 3 };
    const paymentMap: Record<string, number> = { virement: 1, cheque: 2, especes: 3, labaz: 4, ancv: 5, pass_sport: 6, ticket_loisir: 7, up_loisir: 8 };

    const rawAcc = values.accountId;
    const accountIdNum = typeof rawAcc === 'number' ? rawAcc : (accountMap[rawAcc] || (isNaN(Number(rawAcc)) ? 1 : Number(rawAcc)));

    const rawDestAcc = values.destinationAccountId;
    const destAccountIdNum = rawDestAcc ? (typeof rawDestAcc === 'number' ? rawDestAcc : (accountMap[rawDestAcc] || (isNaN(Number(rawDestAcc)) ? null : Number(rawDestAcc)))) : null;

    const rawPay = values.paymentMethodId ?? values.paymentMethod;
    const paymentMethodIdNum = typeof rawPay === 'number' ? rawPay : (paymentMap[rawPay] || (isNaN(Number(rawPay)) ? 1 : Number(rawPay)));

    const rawCat = values.categoryId ?? values.category;
    const categoryIdNum = rawCat !== undefined && rawCat !== null ? (typeof rawCat === 'number' ? rawCat : (isNaN(Number(rawCat)) ? 1 : Number(rawCat))) : null;

    const rawSeason = values.seasonId;
    const seasonIdNum = typeof rawSeason === 'number' ? rawSeason : (isNaN(Number(rawSeason)) ? 1 : Number(rawSeason));

    return db.insert(ledgerEntriesTable).values({
      seasonId: seasonIdNum,
      type: values.type,
      accountId: accountIdNum,
      destinationAccountId: destAccountIdNum,
      categoryId: categoryIdNum,
      amountCents: values.amountCents ?? (values.amount !== undefined ? Math.round(values.amount) : 0),
      date: values.date,
      paymentMethodId: paymentMethodIdNum,
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
