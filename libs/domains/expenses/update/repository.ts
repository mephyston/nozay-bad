import { eq, sql, and, ne } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expensesTable, seasonsTable } from '../shared/schema';
import { ledgerEntriesTable, bankStatementLinesTable } from '@nba/accounting/schema';

export class UpdateExpenseRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async getById(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect | undefined> {
    return db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
  }

  async update(db: DbOrTx, id: number, values: Partial<typeof expensesTable.$inferInsert>): Promise<typeof expensesTable.$inferSelect | undefined> {
    return db.update(expensesTable).set(values).where(eq(expensesTable.id, id)).returning().get();
  }

  buildApproveExpenseStatement(db: DbOrTx, id: number): any {
    return db.update(expensesTable)
      .set({
        status: 'approved',
        ledgerEntryId: sql`(SELECT last_insert_rowid())`
      })
      .where(eq(expensesTable.id, id));
  }

  buildInsertTransactionStatement(db: DbOrTx, values: {
    seasonId: number;
    categoryId: number;
    amountCents: number;
    emitterName: string;
    description: string;
    memberId: number | null;
  }): any {
    const today = new Date().toISOString().split('T')[0];
    return db.insert(ledgerEntriesTable).values({
      seasonId: values.seasonId,
      type: 'depense',
      accountId: 1,
      categoryId: values.categoryId,
      amountCents: values.amountCents,
      date: today,
      paymentMethodId: 1,
      description: `Remboursement frais - ${values.emitterName} - ${values.description}`,
      memberId: values.memberId,
      createdAt: new Date()
    });
  }

  buildCancelApprovalExpenseStatement(db: DbOrTx, id: number): any {
    return db.update(expensesTable)
      .set({ status: 'pending', ledgerEntryId: null })
      .where(eq(expensesTable.id, id));
  }

  buildResetBankStatementLineStatement(db: DbOrTx, bankTxId: number): any {
    return db.update(bankStatementLinesTable)
      .set({ status: 'pending' })
      .where(eq(bankStatementLinesTable.id, bankTxId));
  }

  buildDeleteLedgerEntryStatement(db: DbOrTx, txId: number): any {
    return db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId));
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

  async getTransactionDetails(db: DbOrTx, txId: number): Promise<{ id: number; bankStatementLineId: number | null; amountCents: number } | undefined> {
    return db.select({
      id: ledgerEntriesTable.id,
      bankStatementLineId: ledgerEntriesTable.bankStatementLineId,
      amountCents: ledgerEntriesTable.amountCents
    }).from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId)).get() as any;
  }

  async getBankTransactionDetails(db: DbOrTx, bankTxId: number): Promise<{ id: number; amountCents: number } | undefined> {
    return db.select({
      id: bankStatementLinesTable.id,
      amountCents: bankStatementLinesTable.amountCents
    }).from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bankTxId)).get() as any;
  }

  async getRemainingTransactionsForBankTx(db: DbOrTx, bankTxId: number, excludeTxId: number): Promise<{ id: number; amountCents: number }[]> {
    return db.select({
      id: ledgerEntriesTable.id,
      amountCents: ledgerEntriesTable.amountCents
    }).from(ledgerEntriesTable).where(and(eq(ledgerEntriesTable.bankStatementLineId, bankTxId), ne(ledgerEntriesTable.id, excludeTxId))).all() as any;
  }

  async resetBankTransactionStatus(db: DbOrTx, bankTxId: number): Promise<void> {
    await db.update(bankStatementLinesTable).set({ status: 'pending' }).where(eq(bankStatementLinesTable.id, bankTxId)).run();
  }

  async deleteLedgerEntry(db: DbOrTx, txId: number): Promise<void> {
    await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId)).run();
  }

  async insertTransaction(db: DbOrTx, values: {
    seasonId: number | string;
    category: number;
    amount: number;
    emitterName: string;
    description: string;
    memberId: number | null;
  }): Promise<{ id: number }> {
    const today = new Date().toISOString().split('T')[0];
    const seasonIdInt = await this.resolveSeasonId(db, values.seasonId);
    const res = await db.insert(ledgerEntriesTable).values({
      seasonId: seasonIdInt,
      type: 'depense',
      accountId: 1,
      paymentMethodId: 3,
      categoryId: values.category,
      amountCents: values.amount,
      date: today,
      description: `Remboursement frais - ${values.emitterName} - ${values.description}`,
      memberId: values.memberId,
      createdAt: new Date()
    }).returning({ id: ledgerEntriesTable.id }).get();
    return res;
  }
}
