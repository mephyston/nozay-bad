export interface RefundCardInput {
  clientId: string;
  scanToken: string;
  createdByEmail: string;
}

export interface RefundCardOutput {
  amountCents: number;
  /** Pour le courriel d'information, envoyé par le Worker de la caisse. */
  email: string;
  replayed: boolean;
}
