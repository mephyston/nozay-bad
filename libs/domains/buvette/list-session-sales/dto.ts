export interface SessionSale {
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
  lines: { name: string; quantity: number; unitPriceCents: number }[];
}
