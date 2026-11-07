import type { BuvetteSession } from '../shared/schema';

export interface CurrentSession {
  session: BuvetteSession;
  expectedCashCents: number;
  prepaidCents: number;
  salesCount: number;
  cardCents: number;
  /** Les ventes qui attendent leur CB, et leur dernière tentative. */
  inProgress: { saleId: number; cardCents: number; prepaidCents: number; rechargeCents: number; foreignTxId: string | null; attemptStatus: string | null }[];
  /** Des paiements CB à rembourser depuis SumUp : réussis sur une vente qui n'attendait plus. */
  toRefund: { transactionCode: string | null; amountCents: number; anomaly: string | null }[];
}
