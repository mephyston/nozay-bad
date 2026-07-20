export interface CreateExpenseRepositoryInterface {
  create(db: any, values: {
    seasonId: string;
    description: string;
    category: number;
    amount: number;
    photoUrl: string | null;
    status: 'pending';
    emitterName: string;
    memberId: number | null;
    createdAt: Date;
  }): Promise<any>;
}

export interface ListExpensesRepositoryInterface {
  list(db: any, filters: { season?: string; status?: string }): Promise<any[]>;
}

export interface UpdateExpenseRepositoryInterface {
  getById(db: any, id: number): Promise<any | undefined>;
  update(db: any, id: number, values: {
    description?: string;
    category?: number;
    amount?: number;
    seasonId?: string;
    photoUrl?: string | null;
    emitterName?: string;
    memberId?: number | null;
  }): Promise<any>;
  approve(db: any, id: number, transactionId: number): Promise<any>;
  reject(db: any, id: number): Promise<any>;
  cancelApproval(db: any, id: number): Promise<any>;
  getTransactionDetails(db: any, txId: number): Promise<{ id: number; bankTransactionId: number | null; amount: number } | undefined>;
  getBankTransactionDetails(db: any, bankTxId: number): Promise<{ id: number; amount: number } | undefined>;
  getRemainingTransactionsForBankTx(db: any, bankTxId: number, excludeTxId: number): Promise<{ id: number; amount: number }[]>;
  resetBankTransactionStatus(db: any, bankTxId: number): Promise<void>;
  deleteTransaction(db: any, txId: number): Promise<void>;
  insertTransaction(db: any, values: {
    seasonId: string;
    category: number;
    amount: number;
    emitterName: string;
    description: string;
    memberId: number | null;
  }): Promise<{ id: number }>;
}
