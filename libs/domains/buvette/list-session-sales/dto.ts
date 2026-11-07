export interface SessionSale {
  id: number;
  status: 'in_progress' | 'paid' | 'cancelled';
  createdAt: Date;
  itemsCents: number;
  rechargeCents: number;
  prepaidCents: number;
  cashCents: number;
  cardCents: number;
  lines: { name: string; quantity: number; unitPriceCents: number }[];
}
