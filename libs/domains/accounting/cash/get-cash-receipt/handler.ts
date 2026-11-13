import { AppError, type Db } from '@nba/db';
import { findReceipt, toReceiptView, type CashReceiptView } from '../../shared/cash-store';

/** L'état d'un reçu, pour l'écran qui attend la signature du payeur. L'encaisseur seul le lit. */
export async function getCashReceipt(db: Db, actorEmail: string, id: number): Promise<CashReceiptView> {
  const found = await findReceipt(db, id);
  if (!found || found.receipt.collectorEmail !== actorEmail.toLowerCase()) throw new AppError('Reçu introuvable.', 404);
  return toReceiptView(found.receipt, found.categoryLabel);
}
