export interface CreateCheckDepositInput {
  seasonId: string;
  reference: string;
  date: string;
  checkIds: number[];
}

export interface ClearCheckDepositInput {
  bankStatementLineId: number;
}
