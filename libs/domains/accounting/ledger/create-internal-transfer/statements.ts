import { AppError, type DbOrTx } from '@nba/db';
import { CreateInternalTransferRepository } from './repository';
import { getPaymentMethodByKind } from '../../config/queries';

export interface TransferToBuild {
  sourceAccountId: number;
  destinationAccountId: number;
  amountCents: number;
  date: string;
  description: string;
  reference?: string | null;
}

/**
 * Les ordres de plusieurs virements, à joindre au `db.batch()` d'un autre domaine.
 *
 * La buvette en pose à la clôture de caisse, dans le même lot que la clôture elle-même. Les
 * numéros se suivent à partir du premier libre : `reference` est en UNIQUE, donc une collision
 * fait échouer tout le lot au lieu d'écrire un doublon. L'appelant a contrôlé l'exercice.
 */
export async function buildInternalTransferStatements(
  db: DbOrTx,
  seasonId: number,
  transfers: TransferToBuild[]
): Promise<any[]> {
  if (transfers.length === 0) return [];
  const paymentMethod = await getPaymentMethodByKind(db, 'internal');
  if (!paymentMethod) {
    throw new AppError('Aucun moyen de paiement de nature « virement interne ».', 500);
  }

  const repo = new CreateInternalTransferRepository();
  const seasonCode = await repo.getSeasonCode(db, seasonId);
  let sequence = await repo.nextSequence(db, seasonCode);
  const createdAt = new Date();

  return transfers.flatMap((transfer) => {
    const reference = `VIR-${seasonCode}-${String(sequence++).padStart(4, '0')}`;
    const common = {
      seasonId,
      amountCents: transfer.amountCents,
      paymentMethodId: paymentMethod.id,
      description: transfer.description,
      reference: transfer.reference ?? null,
      date: transfer.date,
      createdAt
    };
    return [
      repo.buildCreateTransferStatement(db, {
        seasonId,
        reference,
        amountCents: transfer.amountCents,
        description: transfer.description,
        createdAt
      }),
      repo.buildCreateLegStatement(db, reference, { ...common, accountId: transfer.sourceAccountId, transferLeg: 'source' }),
      repo.buildCreateLegStatement(db, reference, { ...common, accountId: transfer.destinationAccountId, transferLeg: 'destination' })
    ];
  });
}
