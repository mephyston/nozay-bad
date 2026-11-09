export interface RefundCardInput {
  clientId: string;
  scanToken: string;
  createdByEmail: string;
}

export interface CardRefundLine {
  attemptId: number;
  amountCents: number;
  transactionCode: string | null;
  /** `pending` : demandé à SumUp, pas encore confirmé. Un refus est rendu en espèces. */
  status: 'done' | 'pending';
}

export interface RefundCardOutput {
  amountCents: number;
  /** Ce que le bénévole remet en main propre. */
  cashCents: number;
  /** Ce qui revient sur les CB qui avaient payé les recharges. */
  cardRefunds: CardRefundLine[];
  /** Les parts que SumUp a refusées, rendues en espèces à la place, et pourquoi. */
  cashFallbacks: { amountCents: number; reason: string }[];
  email: string | null;
  replayed: boolean;
}
