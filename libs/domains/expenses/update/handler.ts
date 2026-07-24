import { type Db, type Tx } from '@nba/db';
import { UpdateExpenseRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { normalizeCategory } from '@nba/accounting-api';
import { Expense } from '../shared/expense';
import {
  SeasonClosedError,
  ExpenseNotFoundError,
  ExpenseAlreadyProcessedError,
  ExpenseAlreadyPendingError
} from '../shared/errors';
import { ApproveExpenseInput, ApproveExpenseOutput } from "./dto";

export async function approveExpense(db: Db, id: ApproveExpenseInput): Promise<ApproveExpenseOutput> {
  const repo = new UpdateExpenseRepository();

  // Phase 1 : Lecture (hors batch)
  const expenseData = await repo.getById(db, id);
  if (!expenseData) {
    throw new ExpenseNotFoundError();
  }
  const expense = new Expense(expenseData as any);
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible d\'approuver cette note de frais.');
  }
  if (!expense.canBeApproved()) {
    throw new ExpenseAlreadyProcessedError();
  }

  // Phase 2 : Décision (en mémoire)
  const stmt1 = repo.buildInsertTransactionStatement(db, {
    seasonId: expenseData.seasonId,
    categoryId: expenseData.categoryId,
    amountCents: expenseData.amountCents,
    emitterName: expenseData.emitterName,
    description: expenseData.description,
    memberId: expenseData.memberId,
  });

  const stmt2 = repo.buildApproveExpenseStatement(db, id);

  // Phase 3 : Écriture (db.batch)
  await db.batch([stmt1, stmt2]);

  return (await repo.getById(db, id)) as any;
}

export async function rejectExpense(db: Db, id: number) {
  const repo = new UpdateExpenseRepository();
  const expenseData = await repo.getById(db, id);
  if (!expenseData) {
    throw new ExpenseNotFoundError();
  }
  const expense = new Expense(expenseData as any);
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de rejeter cette note de frais.');
  }
  if (!expense.canBeRejected()) {
    throw new ExpenseAlreadyProcessedError();
  }

  return repo.reject(db, id);
}

export async function cancelExpenseApproval(db: Db, id: number) {
  const repo = new UpdateExpenseRepository();

  // Phase 1 : Lecture (hors batch)
  const expenseData = await repo.getById(db, id);
  if (!expenseData) {
    throw new ExpenseNotFoundError();
  }
  const expense = new Expense(expenseData as any);
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible d\'annuler la validation de cette note de frais.');
  }
  if (!expense.canBeCancelled()) {
    throw new ExpenseAlreadyPendingError();
  }

  const txId = expenseData.ledgerEntryId;
  let resetBankTxNeeded = false;
  let bankTxId: number | null = null;

  if (expenseData.status === 'approved' && txId) {
    const tx = await repo.getTransactionDetails(db, txId);
    if (tx && tx.bankStatementLineId) {
      bankTxId = tx.bankStatementLineId;
      const bankTx = await repo.getBankTransactionDetails(db, tx.bankStatementLineId);
      if (bankTx) {
        const remainingTxs = await repo.getRemainingTransactionsForBankTx(db, tx.bankStatementLineId, tx.id);
        const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
        if (totalRemaining < Math.abs(bankTx.amountCents)) {
          resetBankTxNeeded = true;
        }
      }
    }
  }

  // Phase 2 : Décision (en mémoire)
  const statements: any[] = [repo.buildCancelApprovalExpenseStatement(db, id)];

  if (expenseData.status === 'approved' && txId) {
    if (resetBankTxNeeded && bankTxId) {
      statements.push(repo.buildResetBankStatementLineStatement(db, bankTxId));
    }
    statements.push(repo.buildDeleteLedgerEntryStatement(db, txId));
  }

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);

  return repo.getById(db, id);
}

export async function updateExpense(
  db: Db,
  id: number,
  body: {
    seasonId?: string;
    description?: string;
    category?: string | number;
    amount?: number;
    photoUrl?: string | null;
    emitterName?: string;
    memberId?: number | null;
  }
) {
  const repo = new UpdateExpenseRepository();
  const existingData = await repo.getById(db, id);
  if (!existingData) {
    throw new ExpenseNotFoundError();
  }
  const existing = new Expense(existingData as any);
  if (await isSeasonClosed(db, existing.seasonId)) {
    throw new SeasonClosedError('La saison d\'origine est clôturée. Impossible de modifier cette note de frais.');
  }
  if (body.seasonId && await isSeasonClosed(db, body.seasonId)) {
    throw new SeasonClosedError('La saison cible est clôturée. Impossible d\'affecter cette note de frais.');
  }

  const updated = await repo.update(db, id, {
    description: body.description,
    categoryId: body.category !== undefined ? (normalizeCategory(body.category) || 1) : undefined,
    amountCents: body.amount,
    seasonId: body.seasonId ? await repo.resolveSeasonId(db, body.seasonId) : undefined,
    photoUrl: body.photoUrl !== undefined ? body.photoUrl : undefined,
    emitterName: body.emitterName,
    memberId: body.memberId !== undefined ? body.memberId : undefined
  });
  
  if (!updated) {
    throw new ExpenseNotFoundError();
  }
  return updated;
}
