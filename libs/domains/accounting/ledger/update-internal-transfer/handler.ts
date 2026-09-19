import { AppError, type Db } from '@nba/db';
import { UpdateInternalTransferRepository, type TransferLegRow } from './repository';
import { validateAccrualAndFiscalPhase } from '../../shared/accruals';
import { resolveAccountId } from '../../config/queries';
import { isSeasonClosed } from '../../seasons/queries';
import { SeasonClosedError } from '../../shared/errors';
import type { UpdateInternalTransferDTO, UpdateInternalTransferOutput } from './dto';

/**
 * Corrige un virement interne : le parent et ses **deux** jambes, d'un seul geste.
 *
 * Le grand livre refuse de modifier une jambe seule, et il a raison : un montant corrigé d'un
 * côté et pas de l'autre, c'est de l'argent créé ou détruit entre deux comptes. Ici on reçoit le
 * virement tel que le formulaire le décrit — source, destinataire, montant, deux dates — et on
 * réécrit les trois lignes ensemble, dans un même batch.
 *
 * Une jambe déjà pointée sur une ligne de relevé garde son montant et son compte : le
 * rapprochement les a confrontés à la banque, et la couverture de la ligne en dépend. Pour les
 * changer, on dissocie d'abord au rapprochement. Le libellé, la référence, les dates et
 * l'exercice restent libres.
 */
export async function updateInternalTransfer(
  db: Db,
  id: number,
  body: UpdateInternalTransferDTO
): Promise<UpdateInternalTransferOutput> {
  const repo = new UpdateInternalTransferRepository();

  // Phase 1 : Lecture et validation (hors batch)
  if (!body.seasonId || !body.sourceAccountId || !body.destinationAccountId || !body.amountCents || !body.sourceDate || !body.description) {
    throw new AppError('Champs requis manquants.', 400);
  }
  if (body.amountCents <= 0) {
    throw new AppError('Le montant d\'un virement doit être strictement positif.', 400);
  }
  for (const [label, value] of [['source', body.sourceAccountId], ['destinataire', body.destinationAccountId]] as const) {
    if (typeof value === 'string' && value.trim() === '') {
      throw new AppError(`Le compte ${label} d'un virement doit être désigné explicitement.`, 400);
    }
  }

  const existing = await repo.getById(db, id);
  if (!existing) {
    throw new AppError('Virement introuvable.', 404);
  }
  const source = existing.legs.find((l) => l.transferLeg === 'source');
  const destination = existing.legs.find((l) => l.transferLeg === 'destination');
  if (!source || !destination) {
    throw new AppError('Ce virement est incomplet : il lui manque une jambe. Supprimez-le et ressaisissez-le.', 409);
  }

  // L'exercice d'origine autant que celui d'arrivée : on ne sort pas une écriture d'un exercice clos.
  if (await isSeasonClosed(db, existing.transfer.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de modifier ce virement.');
  }

  const sourceAccountId = await resolveAccountId(db, body.sourceAccountId, { active: true });
  const destinationAccountId = await resolveAccountId(db, body.destinationAccountId, { active: true });
  if (sourceAccountId === destinationAccountId) {
    throw new AppError('Le compte destinataire doit être différent du compte source.', 400);
  }

  const seasonId = await repo.resolveSeasonId(db, body.seasonId);
  if (seasonId === null) {
    throw new AppError('Saison comptable introuvable.', 404);
  }
  const sourceDate = body.sourceDate;
  const destinationDate = body.destinationDate || body.sourceDate;
  if (destinationDate < sourceDate) {
    throw new AppError("L'argent ne peut pas arriver avant d'être parti : la date de crédit précède celle du débit.", 400);
  }
  for (const date of new Set([sourceDate, destinationDate])) {
    await validateAccrualAndFiscalPhase(db, { seasonId: body.seasonId, type: 'transfert', date });
  }

  const frozenBy = (leg: TransferLegRow, accountId: number, side: string) => {
    if (leg.bankStatementLineId === null || leg.bankStatementLineId === undefined) return;
    if (body.amountCents !== leg.amountCents) {
      throw new AppError(`La jambe ${side} de ce virement est pointée sur le relevé : son montant ne se change plus. Dissociez-la d'abord au rapprochement.`, 409);
    }
    if (accountId !== leg.accountId) {
      throw new AppError(`La jambe ${side} de ce virement est pointée sur le relevé : son compte ne se change plus. Dissociez-la d'abord au rapprochement.`, 409);
    }
  };
  frozenBy(source, sourceAccountId, 'source');
  frozenBy(destination, destinationAccountId, 'destinataire');

  // Phase 2 : Décision (en mémoire)
  const common = {
    seasonId,
    amountCents: body.amountCents,
    description: body.description,
    reference: body.reference ?? null
  };
  const statements = [
    repo.buildUpdateTransferStatement(db, id, { seasonId, amountCents: body.amountCents, description: body.description }),
    repo.buildUpdateLegStatement(db, source.id, { ...common, accountId: sourceAccountId, date: sourceDate }),
    repo.buildUpdateLegStatement(db, destination.id, { ...common, accountId: destinationAccountId, date: destinationDate })
  ];

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);

  const updated = await repo.getById(db, id);
  if (!updated) {
    throw new AppError("Le virement n'a pas pu être modifié.", 500);
  }

  return {
    id: updated.transfer.id,
    reference: updated.transfer.reference,
    seasonId: updated.transfer.seasonId,
    amountCents: updated.transfer.amountCents,
    description: updated.transfer.description,
    legs: updated.legs
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
