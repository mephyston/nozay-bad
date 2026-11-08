export interface SessionSale {
  kind: 'sale';
  id: number;
  status: 'in_progress' | 'paid' | 'cancelled';
  createdAt: Date;
  itemsCents: number;
  rechargeCents: number;
  prepaidCents: number;
  cashCents: number;
  cardCents: number;
  /** Ce qui se passerait au remboursement : la carte, si elle existe encore. */
  prepaidCardLabel: string | null;
  prepaidCardDeleted: boolean;
  /** Le numéro SumUp du paiement CB, et où en est son remboursement par l'API. */
  transactionCode: string | null;
  cardAttemptId: number | null;
  cardRefundStatus: 'pending' | 'done' | 'failed' | 'cash' | null;
  lines: { name: string; quantity: number; unitPriceCents: number }[];
}

/** Un solde de carte rendu en espèces : affiché parmi les ventes, pour mémoire, sans action. */
export interface SessionCardRefund {
  kind: 'card_refund';
  id: number;
  createdAt: Date;
  amountCents: number;
  cardLabel: string;
}

export type SessionEntry = SessionSale | SessionCardRefund;
