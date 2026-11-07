export interface CardPaymentRefundOutput {
  attemptId: number;
  /** `pending` : SumUp n'a pas encore confirmé ; la caisse dit d'attendre, jamais de relancer. */
  status: 'done' | 'pending' | 'failed';
  amountCents: number;
  transactionCode: string | null;
  error: string | null;
}
