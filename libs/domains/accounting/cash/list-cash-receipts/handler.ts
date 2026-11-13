import { type Db } from '@nba/db';
import { heldReceipts, toReceiptView, type CashReceiptView } from '../../shared/cash-store';

/** Ce que l'encaisseur détient : ses reçus signés, pas encore remis. */
export async function listHeldCashReceipts(db: Db, actorEmail: string): Promise<{ receipts: CashReceiptView[]; totalCents: number }> {
  const rows = await heldReceipts(db, actorEmail.toLowerCase());
  const receipts = rows.map((r) => toReceiptView(r.receipt, r.categoryLabel));
  return { receipts, totalCents: receipts.reduce((s, r) => s + r.amountCents, 0) };
}
