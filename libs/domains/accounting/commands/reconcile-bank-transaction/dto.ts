export type ReconcileBankTxInternalId = number;
export type ReconcileBankTxInternalInput = Record<string, any>;

export type ReconcileBankTxInternalOutput = { success: boolean, error?: string, status?: number };
