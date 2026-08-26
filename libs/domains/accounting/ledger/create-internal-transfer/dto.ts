export interface CreateInternalTransferDTO {
  seasonId: string | number;
  sourceAccountId: string | number;
  destinationAccountId: string | number;
  /** En centimes, strictement positif : le sens est porté par les comptes, jamais par le signe. */
  amountCents: number;
  /** Date de valeur au débit du compte source. */
  sourceDate: string;
  /** Date de valeur au crédit du compte destinataire ; par défaut, celle du débit. */
  destinationDate?: string;
  description: string;
  reference?: string | null;
}

export interface InternalTransferLeg {
  id: number;
  accountId: number;
  transferLeg: 'source' | 'destination';
  date: string;
  amountCents: number;
  bankStatementLineId: number | null;
}

export interface CreateInternalTransferOutput {
  id: number;
  reference: string;
  seasonId: number;
  amountCents: number;
  description: string;
  legs: InternalTransferLeg[];
}
