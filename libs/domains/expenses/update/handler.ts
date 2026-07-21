import { UpdateExpenseRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-api';
import { normalizeCategory } from '@metacult/features-accounting-api';
import { Expense } from '../shared/expense';
import {
  SeasonClosedError,
  ExpenseNotFoundError,
  ExpenseAlreadyProcessedError,
  ExpenseAlreadyPendingError
} from '../shared/errors';
import { ApproveExpenseInput, ApproveExpenseOutput } from "./dto";

export async function approveExpense(db: any, id: ApproveExpenseInput): Promise<ApproveExpenseOutput> {
  const repo = new UpdateExpenseRepository();

  return db.transaction(async (txDb: any) => {
    const expenseData = await repo.getById(txDb, id);
    if (!expenseData) {
      throw new ExpenseNotFoundError();
    }
    const expense = new Expense(expenseData);
    if (await isSeasonClosed(txDb, expense.seasonId)) {
      throw new SeasonClosedError('La saison est clôturée. Impossible d\'approuver cette note de frais.');
    }
    if (!expense.canBeApproved()) {
      throw new ExpenseAlreadyProcessedError();
    }

    // Créer la transaction de dépense via le repository
    const tx = await repo.insertTransaction(txDb, {
      seasonId: expenseData.seasonId,
      category: expenseData.category,
      amount: expenseData.amount,
      emitterName: expenseData.emitterName,
      description: expenseData.description,
      memberId: expenseData.memberId,
    });

    // Mettre à jour le statut et lier la transaction
    return repo.approve(txDb, id, tx.id);
  });
}

export async function rejectExpense(db: any, id: number) {
  const repo = new UpdateExpenseRepository();
  const expenseData = await repo.getById(db, id);
  if (!expenseData) {
    throw new ExpenseNotFoundError();
  }
  const expense = new Expense(expenseData);
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de rejeter cette note de frais.');
  }
  if (!expense.canBeRejected()) {
    throw new ExpenseAlreadyProcessedError();
  }

  return repo.reject(db, id);
}

export async function cancelExpenseApproval(db: any, id: number) {
  const repo = new UpdateExpenseRepository();

  return db.transaction(async (txDb: any) => {
    const expenseData = await repo.getById(txDb, id);
    if (!expenseData) {
      throw new ExpenseNotFoundError();
    }
    const expense = new Expense(expenseData);
    if (await isSeasonClosed(txDb, expense.seasonId)) {
      throw new SeasonClosedError('La saison est clôturée. Impossible d\'annuler la validation de cette note de frais.');
    }
    if (!expense.canBeCancelled()) {
      throw new ExpenseAlreadyPendingError();
    }

    const txId = expenseData.transactionId;

    // 1. Mettre à jour la note de frais d'abord pour couper la clé étrangère
    const updatedExpense = await repo.cancelApproval(txDb, id);

    // 2. Si approuvée, supprimer la transaction associée
    if (expenseData.status === 'approved' && txId) {
      // 1. Récupérer la transaction via le repository
      const tx = await repo.getTransactionDetails(txDb, txId);

      if (tx) {
        // Rapprochement bancaire : si la transaction est pointée, libérer l'écriture bancaire
        if (tx.bankTransactionId) {
          const bankTx = await repo.getBankTransactionDetails(txDb, tx.bankTransactionId);

          if (bankTx) {
            const remainingTxs = await repo.getRemainingTransactionsForBankTx(txDb, tx.bankTransactionId, tx.id);
            const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            if (totalRemaining < Math.abs(bankTx.amount)) {
              await repo.resetBankTransactionStatus(txDb, tx.bankTransactionId);
            }
          }
        }

        // Supprimer la transaction du Grand Livre
        await repo.deleteTransaction(txDb, tx.id);
      }
    }

    return updatedExpense;
  });
}

export async function updateExpense(
  db: any,
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
  const existing = new Expense(existingData);
  if (await isSeasonClosed(db, existing.seasonId)) {
    throw new SeasonClosedError('La saison d\'origine est clôturée. Impossible de modifier cette note de frais.');
  }
  if (body.seasonId && await isSeasonClosed(db, body.seasonId)) {
    throw new SeasonClosedError('La saison cible est clôturée. Impossible d\'affecter cette note de frais.');
  }

  const updated = await repo.update(db, id, {
    description: body.description,
    category: body.category !== undefined ? (normalizeCategory(body.category) || 1) : undefined,
    amount: body.amount,
    seasonId: body.seasonId,
    photoUrl: body.photoUrl !== undefined ? body.photoUrl : undefined,
    emitterName: body.emitterName,
    memberId: body.memberId !== undefined ? body.memberId : undefined
  });
  
  if (!updated) {
    throw new ExpenseNotFoundError();
  }
  return updated;
}
