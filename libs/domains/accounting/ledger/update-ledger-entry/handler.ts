import { UpdateLedgerEntryRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { AppError, type Db } from '@nba/db';
import { SeasonClosedError } from '../../shared/errors';
import { normalizeCategory } from '../../shared/helpers';
import type { UpdateTransactionDTO } from './dto';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';
import { resolveAccountId, resolvePaymentMethod } from '../../config/queries';

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
    accrualNote: body.accrualNote,
    // Absent du corps, l'adhérent reste celui de l'écriture : c'est lui qu'on contrôle.
    memberId: body.memberId === undefined ? existing.memberId : body.memberId
  });

  /*
   * Un virement interne ne se modifie plus ici.
   *
   * Il lui faut deux écritures — une par compte, chacune avec sa date de valeur et son propre
   * pointage bancaire — et cette route n'en écrit qu'une. La refuser franchement vaut mieux que
   * d'écrire une jambe orpheline : le CHECK de la base la rejetterait de toute façon, mais avec
   * une erreur D1 brute au lieu d'un message.
   */
  if (body.type === 'transfert' || existing.type === 'transfert') {
    throw new AppError('Un virement interne se modifie via PUT /accounting/internal-transfers/:id.', 400);
  }

  if (!body.category) {
    throw new AppError('La catégorie est obligatoire pour les recettes/dépenses.', 400);
  }

  const seasonIdNum = Number(body.seasonId);
  const seasonIdInt = !isNaN(seasonIdNum) ? seasonIdNum : existing.seasonId;

  const accountIdInt = await resolveAccountId(db, body.accountId, { active: true });

  const paymentMethod = await resolvePaymentMethod(db, body.paymentMethod, { active: true });
  const paymentMethodIdInt = paymentMethod.id;

  /*
   * Corriger le mode de règlement d'une écriture non pointée en recalcule le statut : passer un
   * virement en chèque, c'est dire que l'argent n'est pas encore en banque.
   *
   * Une écriture DÉJÀ pointée garde le sien. Le rapprochement l'a confrontée à une ligne de
   * relevé : la banque a parlé, et une correction de libellé ne doit pas défaire ce constat.
   */
  const isPointed = existing.bankStatementLineId !== null && existing.bankStatementLineId !== undefined;
  const status = isPointed ? existing.status : paymentMethod.defaultEntryStatus;

  const categoryIdInt = body.category ? (typeof body.category === 'number' ? body.category : Number(body.category) || 1) : null;

  const updated = await repo.update(db, id, {
    seasonId: seasonIdInt,
    type: body.type,
    accountId: accountIdInt,
    categoryId: categoryIdInt,
    amountCents: (body as any).amountCents ?? (body.amount !== undefined ? Math.round(body.amount) : existing.amountCents),
    date: body.date,
    paymentMethodId: paymentMethodIdInt,
    description: body.description,
    reference: body.reference || null,
    accrualType: body.accrualType || 'normal',
    accrualNote: body.accrualNote || null,
    ...(body.memberId !== undefined ? { memberId: body.memberId } : {}),
    status
  });

  if (!updated) {
    throw new AppError('Transaction introuvable', 404);
  }
  return updated;
}
