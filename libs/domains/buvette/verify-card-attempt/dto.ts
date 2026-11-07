export interface AttemptState {
  foreignTxId: string;
  amountCents: number;
  attemptStatus: 'pending' | 'expired' | 'successful' | 'failed';
  anomaly: 'late' | 'amount' | null;
  saleId: number;
  saleStatus: 'in_progress' | 'paid' | 'cancelled';
}

export interface NewAttempt {
  foreignTxId: string;
  amountCents: number;
}
