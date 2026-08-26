export interface UpdateBankStatementLineStatusInput {
  id: number;
  status: 'pending' | 'ignored';
}

export interface UpdateBankStatementLineStatusesInput {
  ids: number[];
  status: 'pending' | 'ignored';
}
