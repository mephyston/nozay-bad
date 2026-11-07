export interface ScanCardOutput {
  scanToken: string;
  /** Une adresse masquée : de quoi reconnaître le client, sans la dévoiler au bénévole. */
  label: string;
  balanceCents: number;
}
