import { AppError, type Db } from '@nba/db';
import { CreateInternalTransferRepository } from './repository';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';
import { resolveAccountId, getPaymentMethodByCode } from '../../config/queries';
import type { CreateInternalTransferDTO, CreateInternalTransferOutput } from './dto';

/**
 * Enregistre un virement interne : un parent, et **deux** écritures qui se répondent.
 *
 * Chaque jambe est une écriture ordinaire sur un compte. C'est ce qui rend le rapprochement
 * possible : un virement courant↔livret produit deux lignes de relevé, et chaque jambe peut
 * désormais pointer la sienne. Sous l'ancien modèle — une écriture portant ses deux comptes —
 * l'une des deux lignes restait éternellement non comptabilisée, ce qui creusait un écart
 * permanent dans l'état de rapprochement **et** bloquait la clôture de l'exercice.
 *
 * Les deux dates sont distinctes à dessein : un dépôt d'espèces sort de la caisse un jour et
 * arrive en banque quelques jours plus tard. L'écart entre les deux, c'est l'argent en transit —
 * un nombre que le modèle précédent ne savait pas dire.
 */
export async function createInternalTransfer(
  db: Db,
  body: CreateInternalTransferDTO
): Promise<CreateInternalTransferOutput> {
  const repo = new CreateInternalTransferRepository();

  // Phase 1 : Lecture et validation (hors batch)
  if (!body.seasonId || !body.sourceAccountId || !body.destinationAccountId || !body.amountCents || !body.sourceDate || !body.description) {
    throw new AppError('Champs requis manquants.', 400);
  }
  if (body.amountCents <= 0) {
    throw new AppError('Le montant d\'un virement doit être strictement positif.', 400);
  }

  /*
   * Les deux comptes sont exigés explicitement, sans repli.
   *
   * `resolveAccountId` accepte un repli pour l'absence de valeur — utile ailleurs, dangereux ici :
   * une chaîne vide ou blanche passait le test de présence, était trimée, et le virement partait
   * vers le compte par défaut. De l'argent déplacé vers un compte que personne n'a désigné, sans
   * le moindre message. Un virement nomme ses deux comptes ou n'existe pas.
   */
  for (const [label, value] of [['source', body.sourceAccountId], ['destinataire', body.destinationAccountId]] as const) {
    if (typeof value === 'string' && value.trim() === '') {
      throw new AppError(`Le compte ${label} d'un virement doit être désigné explicitement.`, 400);
    }
  }

  const sourceAccountId = await resolveAccountId(db, body.sourceAccountId);
  const destinationAccountId = await resolveAccountId(db, body.destinationAccountId);
  if (sourceAccountId === destinationAccountId) {
    throw new AppError('Le compte destinataire doit être différent du compte source.', 400);
  }

  const seasonId = await repo.resolveSeasonId(db, body.seasonId);
  const sourceDate = body.sourceDate;
  const destinationDate = body.destinationDate || body.sourceDate;
  if (destinationDate < sourceDate) {
    throw new AppError("L'argent ne peut pas arriver avant d'être parti : la date de crédit précède celle du débit.", 400);
  }

  /*
   * Les deux dates sont contrôlées, pas seulement celle du débit : un virement à cheval sur la
   * clôture arriverait sinon dans un exercice déjà arrêté par sa seule jambe créditrice.
   */
  for (const date of new Set([sourceDate, destinationDate])) {
    await validateAccrualAndFiscalPhase(db, { seasonId: body.seasonId, type: 'transfert', date });
  }

  /*
   * Un moyen de paiement dédié, et non celui resté dans le formulaire : `payment_methods` porte
   * un `default_entry_status`, et un virement héritait ainsi d'un `in_vault` dépourvu de sens que
   * le calcul de solde ignorait sans le dire.
   */
  const paymentMethod = await getPaymentMethodByCode(db, 'virement_interne');
  if (!paymentMethod) {
    throw new AppError('Moyen de paiement « virement_interne » introuvable : la migration 0023 n\'a pas été appliquée.', 500);
  }

  const seasonCode = await repo.getSeasonCode(db, seasonId);
  const sequence = await repo.nextSequence(db, seasonCode);
  const reference = `VIR-${seasonCode}-${String(sequence).padStart(4, '0')}`;
  const createdAt = new Date();

  // Phase 2 : Décision (en mémoire)
  const common = {
    seasonId,
    amountCents: body.amountCents,
    paymentMethodId: paymentMethod.id,
    description: body.description,
    reference: body.reference ?? null,
    createdAt
  };

  const statements = [
    repo.buildCreateTransferStatement(db, {
      seasonId,
      reference,
      amountCents: body.amountCents,
      description: body.description,
      createdAt
    }),
    repo.buildCreateLegStatement(db, reference, {
      ...common,
      accountId: sourceAccountId,
      transferLeg: 'source',
      date: sourceDate
    }),
    repo.buildCreateLegStatement(db, reference, {
      ...common,
      accountId: destinationAccountId,
      transferLeg: 'destination',
      date: destinationDate
    })
  ];

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);

  const created = await repo.getByReference(db, reference);
  if (!created) {
    throw new AppError("Le virement n'a pas pu être enregistré.", 500);
  }

  return {
    id: created.transfer.id,
    reference: created.transfer.reference,
    seasonId: created.transfer.seasonId,
    amountCents: created.transfer.amountCents,
    description: created.transfer.description,
    legs: created.legs
      .map((l: any) => ({
        id: l.id,
        accountId: l.accountId,
        transferLeg: l.transferLeg,
        date: l.date,
        amountCents: l.amountCents,
        bankStatementLineId: l.bankStatementLineId
      }))
      .sort((a: any, b: any) => (a.transferLeg === 'source' ? -1 : 1) - (b.transferLeg === 'source' ? -1 : 1))
  };
}
