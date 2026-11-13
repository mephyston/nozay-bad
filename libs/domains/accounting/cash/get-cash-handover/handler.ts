import { AppError, type Db } from '@nba/db';
import { findHandover, handoverReceipts, toReceiptView, type CashReceiptView } from '../../shared/cash-store';

export interface CashHandoverView {
  id: number;
  status: 'pending' | 'sealed' | 'cancelled';
  collectorEmail: string;
  treasurerEmail: string;
  expectedCents: number;
  countedCents: number;
  gapCents: number;
  signatureMethod: string | null;
  signedAt: string | null;
  receipts: CashReceiptView[];
}

/** Une remise et ses reçus, pour l'écran du trésorier qui attend la signature. */
export async function getCashHandover(db: Db, id: number): Promise<CashHandoverView> {
  const h = await findHandover(db, id);
  if (!h) throw new AppError('Remise introuvable.', 404);
  const receipts = (await handoverReceipts(db, id)).map((r) => toReceiptView(r.receipt, r.categoryLabel));
  return {
    id: h.id,
    status: h.status,
    collectorEmail: h.collectorEmail,
    treasurerEmail: h.treasurerEmail,
    expectedCents: h.expectedCents,
    countedCents: h.countedCents,
    gapCents: h.countedCents - h.expectedCents,
    signatureMethod: h.signatureMethod,
    signedAt: h.signedAt ? h.signedAt.toISOString() : null,
    receipts
  };
}
