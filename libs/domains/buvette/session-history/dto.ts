export interface SessionSummary {
  id: number;
  businessDate: string;
  status: 'open' | 'closed';
  accountingCategoryId: number;
  openedByEmail: string;
  openingFloatCents: number;
  closedByEmail: string | null;
  countedCashCents: number | null;
  gapCents: number | null;
  salesCount: number;
  itemsCents: number;
  rechargeCents: number;
  cashCents: number;
  cardCents: number;
  prepaidCents: number;
  refundsCashCents: number;
  refundsCardCents: number;
}

export interface ItemReportLine {
  name: string;
  quantity: number;
  amountCents: number;
}

export interface SessionReportSale {
  id: number;
  status: 'in_progress' | 'paid' | 'cancelled';
  createdAt: Date;
  createdByEmail: string;
  itemsCents: number;
  rechargeCents: number;
  prepaidCents: number;
  cashCents: number;
  cardCents: number;
  transactionCode: string | null;
  lines: { name: string; quantity: number; unitPriceCents: number }[];
}

export interface SessionReport {
  session: SessionSummary;
  sales: SessionReportSale[];
  cardRefunds: { id: number; createdAt: Date; amountCents: number; byCard: boolean; createdByEmail: string }[];
  items: ItemReportLine[];
}
