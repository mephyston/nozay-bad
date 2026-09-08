export type GetMemberCseDataInput = number;

export type GetMemberCseDataOutput = {
  lastName: string;
  firstName: string;
  birthDate: string;
  /** Montant dû, en centimes. */
  amount: number;
  /** Montant réglé à ce jour, en centimes ; en deçà du dû, l'attestation le dit. */
  amountReceived: number;
  paymentMethod: string;
  paymentDate: string;
  season: string;
};
