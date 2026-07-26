import { UpdateLedgerEntryRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { AppError, type Db } from '@nba/db';
import { SeasonClosedError } from '../../shared/errors';
import { normalizeCategory } from '../../shared/helpers';
import type { UpdateTransactionDTO } from './dto';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';

export async function updateLedgerEntry(db: Db, id: number, body: UpdateTransactionDTO & { accrualType?: string; accrualNote?: string }) {
  if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new UpdateLedgerEntryRepository();
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

  const seasonIdNum = Number(body.seasonId);
  const seasonIdInt = !isNaN(seasonIdNum) ? seasonIdNum : existing.seasonId;

  const accountIdMap: Record<string, number> = { current: 1, savings: 2, cash: 3 };
  const accountIdInt = typeof body.accountId === 'number' ? body.accountId : accountIdMap[body.accountId] || 1;
  const destAccountIdInt = body.destinationAccountId ? (typeof body.destinationAccountId === 'number' ? body.destinationAccountId : accountIdMap[body.destinationAccountId] || 2) : null;

  const paymentMethodMap: Record<string, number> = { virement: 1, cheque: 2, especes: 3, labaz: 4, ancv: 5, pass_sport: 6, ticket_loisir: 7, up_loisir: 8 };
  const paymentMethodIdInt = typeof body.paymentMethod === 'number' ? body.paymentMethod : paymentMethodMap[body.paymentMethod] || 1;

  const categoryIdInt = body.category ? (typeof body.category === 'number' ? body.category : Number(body.category) || 1) : null;

  const updated = await repo.update(db, id, {
    seasonId: seasonIdInt,
    type: body.type,
    accountId: accountIdInt,
    destinationAccountId: body.type === 'transfert' ? destAccountIdInt : null,
    categoryId: body.type !== 'transfert' ? categoryIdInt : null,
    amountCents: (body as any).amountCents ?? (body.amount !== undefined ? Math.round(body.amount) : existing.amountCents),
    date: body.date,
    paymentMethodId: paymentMethodIdInt,
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
