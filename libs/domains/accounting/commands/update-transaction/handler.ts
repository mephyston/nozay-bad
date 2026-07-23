import { UpdateTransactionRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { AppError, type Db } from '@nba/db';
import { SeasonClosedError } from '../../shared/errors';
import { normalizeCategory } from '@nba/accounting-api';
import type { UpdateTransactionDTO } from './dto';

export async function updateTransaction(db: Db, id: number, body: UpdateTransactionDTO) {
  if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new UpdateTransactionRepository();
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
