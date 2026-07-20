import { TransactionsRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { AppError } from '@metacult/shared-db';
import { SeasonClosedError } from '../shared/errors';
import { normalizeCategory } from '@metacult/features-accounting-data-access';

export async function listTransactions(
  db: any,
  filters: {
    seasonId?: string;
    accountId?: string;
    type?: string;
    category?: string;
    classCode?: string;
    memberId?: string;
    unreconciledChequesOnly?: boolean;
  },
  pagination: { page: number; limit: number }
) {
  const repo = new TransactionsRepository();
  const offset = (pagination.page - 1) * pagination.limit;

  const total = await repo.count(db, filters);
  const data = await repo.list(db, filters, { limit: pagination.limit, offset });

  return {
    data,
    pagination: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit) || 1
    }
  };
}

export async function createTransaction(db: any, body: {
  seasonId: string;
  type: 'recette' | 'depense' | 'transfert';
  accountId: string;
  destinationAccountId?: string;
  category?: string | number;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
  reference?: string;
}) {
  if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
    throw new AppError('Champs requis manquants.', 400);
  }

  if (await isSeasonClosed(db, body.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de créer une transaction.');
  }

  if (body.type === 'transfert') {
    if (!body.destinationAccountId || body.accountId === body.destinationAccountId) {
      throw new AppError('Le compte destinataire doit être différent du compte source.', 400);
    }
  } else {
    if (!body.category) {
      throw new AppError('La catégorie est obligatoire pour les recettes/dépenses.', 400);
    }
  }

  const repo = new TransactionsRepository();
  return repo.create(db, {
    seasonId: body.seasonId,
    type: body.type,
    accountId: body.accountId,
    destinationAccountId: body.type === 'transfert' ? body.destinationAccountId : null,
    category: body.type !== 'transfert' ? normalizeCategory(body.category) : null,
    amount: Math.round(body.amount),
    date: body.date,
    paymentMethod: body.paymentMethod,
    description: body.description,
    reference: body.reference || null,
    createdAt: new Date()
  });
}

export async function updateTransaction(db: any, id: number, body: {
  seasonId: string;
  type: 'recette' | 'depense' | 'transfert';
  accountId: string;
  destinationAccountId?: string;
  category?: string | number;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
  reference?: string;
}) {
  if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new TransactionsRepository();
  const existing = await repo.getById(db, id);
  if (!existing) {
    throw new AppError('Transaction introuvable', 404);
  }

  if (await isSeasonClosed(db, existing.seasonId)) {
    throw new SeasonClosedError('La saison d\'origine est clôturée. Impossible de modifier cette transaction.');
  }

  if (await isSeasonClosed(db, body.seasonId)) {
    throw new SeasonClosedError('La saison cible est clôturée. Impossible d\'affecter cette transaction.');
  }

  if (body.type === 'transfert') {
    if (!body.destinationAccountId || body.accountId === body.destinationAccountId) {
      throw new AppError('Le compte destinataire doit être différent du compte source.', 400);
    }
  } else {
    if (!body.category) {
      throw new AppError('La catégorie est obligatoire pour les recettes/dépenses.', 400);
    }
  }

  const updated = await repo.update(db, id, {
    seasonId: body.seasonId,
    type: body.type,
    accountId: body.accountId,
    destinationAccountId: body.type === 'transfert' ? body.destinationAccountId : null,
    category: body.type !== 'transfert' ? normalizeCategory(body.category) : null,
    amount: Math.round(body.amount),
    date: body.date,
    paymentMethod: body.paymentMethod,
    description: body.description,
    reference: body.reference || null
  });

  if (!updated) {
    throw new AppError('Transaction introuvable', 404);
  }
  return updated;
}

export async function deleteTransaction(db: any, id: number) {
  const repo = new TransactionsRepository();
  const tx = await repo.getById(db, id);
  if (!tx) {
    throw new AppError('Transaction non trouvée', 404);
  }

  if (await isSeasonClosed(db, tx.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de supprimer cette transaction.');
  }

  // 2. Si liée à un relevé bancaire, recalculer le pointage restant
  if (tx.bankTransactionId) {
    const bankTx = await repo.getBankTransactionById(db, tx.bankTransactionId);
    if (bankTx) {
      const remainingTxs = await repo.getRemainingTransactionsForBankTx(db, tx.bankTransactionId, id);
      const totalRemaining = remainingTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

      if (totalRemaining < Math.abs(bankTx.amount)) {
        await repo.updateBankTransactionStatus(db, tx.bankTransactionId, 'pending');
      }
    }
  }

  // 3. Si liée à un adhérent pour une adhésion, déduire le montant reçu
  if (tx.memberId && (tx.category === 1 || String(tx.category) === '1')) {
    const member = await repo.getMemberById(db, tx.memberId);
    if (member) {
      const newReceived = Math.max(0, member.amountReceived - Math.abs(tx.amount));
      const newRemaining = Math.max(0, member.amountDue - newReceived);
      const isPaid = newRemaining === 0;

      await repo.updateMemberPayment(db, tx.memberId, {
        amountReceived: newReceived,
        amountRemaining: newRemaining,
        paid: isPaid
      });
    }
  }

  // 3.5. Si liée à une note de frais, la repasser en 'pending'
  await repo.resetExpenseStatusByTxId(db, id);

  // 4. Supprimer la transaction du Grand Livre
  await repo.delete(db, id);
}
