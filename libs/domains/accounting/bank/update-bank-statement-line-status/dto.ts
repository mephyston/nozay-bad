export interface UpdateBankStatementLineStatusInput {
  id: number;
  status: 'pending' | 'ignored';
}
