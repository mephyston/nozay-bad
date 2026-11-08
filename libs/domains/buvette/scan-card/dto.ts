export interface ScanCardOutput {
  scanToken: string;
  /** Une adresse masquée : de quoi reconnaître le client, sans la dévoiler au bénévole. */
  label: string;
  /** Le solde disponible : ce qu'une vente en cours a réservé n'y figure pas. */
  balanceCents: number;
  /** La commande que le client a préparée sur son téléphone, s'il y en a une. */
  pendingOrderId: number | null;
  kind: 'account' | 'paper';
  /** `new` : la carte papier reste à vendre, à sa valeur faciale. */
  paperStatus: 'new' | 'active' | 'closed' | null;
  faceValueCents: number | null;
  /** Au remboursement, ce qui reviendrait sur les CB des recharges ; le reste sort en espèces. */
  cbRefundableCents: number;
}
