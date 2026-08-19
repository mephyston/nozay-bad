import { type DbOrTx } from '@nba/db';
import { eq, and, ne } from 'drizzle-orm';
import { ledgerEntriesTable, bankStatementLinesTable } from '../shared/schema';

export function buildDeleteLedgerEntryStatement(db: DbOrTx, txId: number): any {
  return db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId));
}

export function buildResetBankStatementLineStatement(db: DbOrTx, bankTxId: number): any {
  return db.update(bankStatementLinesTable)
    .set({ status: 'pending' })
    .where(eq(bankStatementLinesTable.id, bankTxId));
}

export async function getTransactionDetails(db: DbOrTx, txId: number): Promise<{ id: number; bankStatementLineId: number | null; amountCents: number } | undefined> {
  return db.select({
    id: ledgerEntriesTable.id,
    bankStatementLineId: ledgerEntriesTable.bankStatementLineId,
    amountCents: ledgerEntriesTable.amountCents
  }).from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId)).get() as any;
}

export async function getBankTransactionDetails(db: DbOrTx, bankTxId: number): Promise<{ id: number; amountCents: number } | undefined> {
  return db.select({
    id: bankStatementLinesTable.id,
    amountCents: bankStatementLinesTable.amountCents
  }).from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, bankTxId)).get() as any;
}

export async function getRemainingTransactionsForBankTx(db: DbOrTx, bankTxId: number, excludeTxId: number): Promise<{ id: number; amountCents: number }[]> {
  return db.select({
    id: ledgerEntriesTable.id,
    amountCents: ledgerEntriesTable.amountCents
  }).from(ledgerEntriesTable).where(and(eq(ledgerEntriesTable.bankStatementLineId, bankTxId), ne(ledgerEntriesTable.id, excludeTxId))).all() as any;
}

export function buildInsertExpenseTransactionStatement(db: DbOrTx, values: {
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

export async function insertExpenseTransaction(db: DbOrTx, values: {
  seasonId: number;
  category: number;
  amount: number;
  emitterName: string;
  description: string;
  memberId: number | null;
}): Promise<{ id: number }> {
  const today = new Date().toISOString().split('T')[0];
  const res = await db.insert(ledgerEntriesTable).values({
    seasonId: values.seasonId,
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
  return res as any;
}

export async function resetBankTransactionStatus(db: DbOrTx, bankTxId: number): Promise<void> {
  await db.update(bankStatementLinesTable).set({ status: 'pending' }).where(eq(bankStatementLinesTable.id, bankTxId)).run();
}

export async function deleteLedgerEntry(db: DbOrTx, txId: number): Promise<void> {
  await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, txId)).run();
}
