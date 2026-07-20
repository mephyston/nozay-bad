export interface ListBankTransactionsInput {
  seasonId: string;
  filters?: {
    status?: string;
    accountId?: string;
  };
}
export type ListBankTransactionsOutput = any[];
