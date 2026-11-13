import { AppError, type Db } from '@nba/db';
import { cancelPendingReceipt, findReceipt } from '../../shared/cash-store';

/** L'encaisseur abandonne un reçu que personne n'a signé : il n'a jamais existé. */
export async function cancelCashReceipt(db: Db, actorEmail: string, id: number): Promise<void> {
  const found = await findReceipt(db, id);
  if (!found || found.receipt.collectorEmail !== actorEmail.toLowerCase()) throw new AppError('Reçu introuvable.', 404);
  if (found.receipt.status !== 'pending') throw new AppError('Un reçu signé ne s’annule pas : il se règle à la remise.', 409);
  // La bascule ne vaut que pour un reçu encore en attente : signé entre-temps, il reste signé.
  if (!(await cancelPendingReceipt(db, id))) throw new AppError('Ce reçu vient d’être signé.', 409);
}
