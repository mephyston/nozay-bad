export interface UpdateBankTransactionStatusInput {
  id: number;
  status: 'pending' | 'ignored';
}
