export interface CloseSessionInput {
  sessionId: number;
  countedCashCents: number;
  closedByEmail: string;
}

export interface CloseSessionOutput {
  sessionId: number;
  expectedCashCents: number;
  countedCashCents: number;
  gapCents: number;
  itemsCashCents: number;
  rechargeCashCents: number;
  prepaidCents: number;
  refundsCents: number;
}
