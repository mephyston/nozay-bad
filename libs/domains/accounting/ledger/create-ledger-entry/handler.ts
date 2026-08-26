import { CreateLedgerEntryRepository } from './repository';
import { AppError, type Db } from '@nba/db';
import { normalizeCategory } from '../../shared/helpers';
import type { CreateTransactionDTO } from './dto';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';
import { resolveAccountId, resolvePaymentMethod } from '../../config/queries';

export async function createLedgerEntry(db: Db, body: CreateTransactionDTO & { accrualType?: string; accrualNote?: string }) {
  if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
    throw new AppError('Champs requis manquants.', 400);
  }

  await validateAccrualAndFiscalPhase(db, {
    seasonId: body.seasonId,
    type: body.type,
    date: body.date,
    accrualType: body.accrualType,
    accrualNote: body.accrualNote
  });

  /*
   * Un virement interne ne se saisit plus ici.
   *
   * Il lui faut deux écritures — une par compte, chacune avec sa date de valeur et son propre
   * pointage bancaire — et cette route n'en écrit qu'une. La refuser franchement vaut mieux que
   * d'écrire une jambe orpheline : le CHECK de la base la rejetterait de toute façon, mais avec
   * une erreur D1 brute au lieu d'un message.
   */
  if (body.type === 'transfert') {
    throw new AppError('Un virement interne se saisit via POST /accounting/internal-transfers.', 400);
  }

  if (!body.category) {
    throw new AppError('La catégorie est obligatoire pour les recettes/dépenses.', 400);
  }

  const repo = new CreateLedgerEntryRepository();
  const seasonIdInt = await repo.resolveSeasonId(db, body.seasonId);

  const accountIdInt = await resolveAccountId(db, body.accountId);

  const paymentMethod = await resolvePaymentMethod(db, body.paymentMethod);
  const paymentMethodIdInt = paymentMethod.id;

  const categoryIdInt = body.category ? (typeof body.category === 'number' ? body.category : Number(body.category) || 1) : null;

  return repo.create(db, {
    seasonId: seasonIdInt,
    type: body.type,
    accountId: accountIdInt,
    categoryId: categoryIdInt,
    amountCents: (body as any).amountCents ?? (body.amount !== undefined ? Math.round(body.amount) : 0),
    date: body.date,
    paymentMethodId: paymentMethodIdInt,
    description: body.description,
    reference: body.reference || null,
    accrualType: body.accrualType || 'normal',
    accrualNote: body.accrualNote || null,
    /*
     * Le statut vient du mode de règlement, il n'est plus forcé à `cleared`.
     *
     * `payment_methods.default_entry_status` dit depuis toujours qu'un chèque naît `in_vault` :
     * encaissé dans les livres, encore dans le coffre. Le forçage écrasait cette réponse, si
     * bien qu'aucune écriture n'a jamais porté d'autre statut que `cleared` — et que le solde
     * bancaire théorique, qui se déduit précisément de ce statut, ne pouvait jamais différer du
     * solde comptable. Le mécanisme existait ; rien ne l'alimentait.
     */
    status: paymentMethod.defaultEntryStatus,
    createdAt: new Date()
  });
}
