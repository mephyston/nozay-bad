export interface CreateCheckDepositInput {
  seasonId: string;
  reference: string;
  date: string;
  checkIds: number[];
}

/** Confirmation du dépôt en banque d'une remise « à déposer ». La date, si donnée, remplace celle prévue. */
export interface DepositCheckDepositInput {
  date?: string;
}

export interface ClearCheckDepositInput {
  bankStatementLineId: number;
}
