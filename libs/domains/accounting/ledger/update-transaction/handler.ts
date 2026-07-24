import { UpdateTransactionRepository } from './repository';
import { AppError, type Db } from '@nba/db';
import { normalizeCategory } from '../../shared/helpers';
import type { UpdateTransactionDTO } from './dto';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';

export async function updateTransaction(db: Db, id: number, body: UpdateTransactionDTO & { accrualType?: string; accrualNote?: string }) {
  if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new UpdateTransactionRepository();
  const existing = await repo.getById(db, id);
  if (!existing) {
    throw new AppError('Transaction introuvable', 404);
  }

  await validateAccrualAndFiscalPhase(db, {
    seasonId: body.seasonId,
    type: body.type,
    date: body.date,
    accrualType: body.accrualType,
    accrualNote: body.accrualNote
  });

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
    reference: body.reference || null,
    accrualType: body.accrualType || 'normal',
    accrualNote: body.accrualNote || null
  });

  if (!updated) {
    throw new AppError('Transaction introuvable', 404);
  }
  return updated;
}
