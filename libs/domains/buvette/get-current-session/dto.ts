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
  toRefund: {
    /** `stray` : un paiement sur une vente terminée. `card_balance` : un solde de carte que SumUp n'a pas pu rendre sur la CB. */
    kind: 'stray' | 'card_balance';
    attemptId: number;
    transactionCode: string | null;
    amountCents: number;
    anomaly: string | null;
    refundStatus: 'pending' | 'done' | 'failed' | 'cash' | null;
  }[];
}
