import { CreateTransactionRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-api';
import { AppError } from '@metacult/shared-db';
import { SeasonClosedError } from '../../shared/errors';
import { normalizeCategory } from '@metacult/features-accounting-api';
import type { CreateTransactionDTO } from './dto';

export async function createTransaction(db: any, body: CreateTransactionDTO) {
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

  const repo = new CreateTransactionRepository();
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
