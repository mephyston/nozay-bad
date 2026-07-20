import { UpdateExpenseRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { normalizeCategory } from '@metacult/features-accounting-data-access';
import { AppError } from '@metacult/shared-db';

export async function approveExpense(db: any, id: number) {
  const repo = new UpdateExpenseRepository();
  const expense = await repo.getById(db, id);
  if (!expense) {
    throw new AppError('Dépense introuvable', 404);
  }
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new AppError('La saison est clôturée. Impossible d\'approuver cette note de frais.', 400);
  }
  if (expense.status !== 'pending') {
    throw new AppError('Dépense déjà traitée', 400);
  }

  // Créer la transaction de dépense via le repository
  const tx = await repo.insertTransaction(db, {
    seasonId: expense.seasonId,
    category: expense.category,
    amount: expense.amount,
    emitterName: expense.emitterName,
    description: expense.description,
    memberId: expense.memberId,
  });

  // Mettre à jour le statut et lier la transaction
  return repo.approve(db, id, tx.id);
}

export async function rejectExpense(db: any, id: number) {
  const repo = new UpdateExpenseRepository();
  const expense = await repo.getById(db, id);
  if (!expense) {
    throw new AppError('Dépense introuvable', 404);
  }
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new AppError('La saison est clôturée. Impossible de rejeter cette note de frais.', 400);
  }
  if (expense.status !== 'pending') {
    throw new AppError('Dépense déjà traitée', 400);
  }

  return repo.reject(db, id);
}

export async function cancelExpenseApproval(db: any, id: number) {
  const repo = new UpdateExpenseRepository();
  const expense = await repo.getById(db, id);
  if (!expense) {
    throw new AppError('Dépense introuvable', 404);
  }
  if (await isSeasonClosed(db, expense.seasonId)) {
    throw new AppError('La saison est clôturée. Impossible d\'annuler la validation de cette note de frais.', 400);
  }
  if (expense.status === 'pending') {
    throw new AppError('Dépense déjà en attente', 400);
  }

  const txId = expense.transactionId;

  // 1. Mettre à jour la note de frais d'abord pour couper la clé étrangère
  const updatedExpense = await repo.cancelApproval(db, id);

  // 2. Si approuvée, supprimer la transaction associée
  if (expense.status === 'approved' && txId) {
    // 1. Récupérer la transaction via le repository
    const tx = await repo.getTransactionDetails(db, txId);

    if (tx) {
      // Rapprochement bancaire : si la transaction est pointée, libérer l'écriture bancaire
      if (tx.bankTransactionId) {
        const bankTx = await repo.getBankTransactionDetails(db, tx.bankTransactionId);

        if (bankTx) {
          const remainingTxs = await repo.getRemainingTransactionsForBankTx(db, tx.bankTransactionId, tx.id);
          const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          if (totalRemaining < Math.abs(bankTx.amount)) {
            await repo.resetBankTransactionStatus(db, tx.bankTransactionId);
          }
        }
      }

      // Supprimer la transaction du Grand Livre
      await repo.deleteTransaction(db, tx.id);
    }
  }

  return updatedExpense;
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
  const existing = await repo.getById(db, id);
  if (!existing) {
    throw new AppError('Dépense introuvable', 404);
  }
  if (await isSeasonClosed(db, existing.seasonId)) {
    throw new AppError('La saison d\'origine est clôturée. Impossible de modifier cette note de frais.', 400);
  }
  if (body.seasonId && await isSeasonClosed(db, body.seasonId)) {
    throw new AppError('La saison cible est clôturée. Impossible d\'affecter cette note de frais.', 400);
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
    throw new AppError('Dépense introuvable', 404);
  }
  return updated;
}
