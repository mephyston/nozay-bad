export interface ScanCardOutput {
  scanToken: string;
  /** Une adresse masquée : de quoi reconnaître le client, sans la dévoiler au bénévole. */
  label: string;
  /** Le solde disponible : ce qu'une vente en cours a réservé n'y figure pas. */
  balanceCents: number;
}
