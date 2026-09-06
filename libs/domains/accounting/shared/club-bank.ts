/**
 * Coordonnées bancaires du club, imprimées sur les documents qui les mentionnent
 * (facture : compte à créditer par le client ; bordereau : compte de dépôt des chèques).
 * En dur : elles changent rarement, et un réglage de plus serait un réglage à oublier.
 */
export const CLUB_BANK = {
  titulaire: 'Nozay Badminton',
  nom: 'Société Générale',
  iban: 'FR76 3000 3008 4600 0500 0784 720',
  bic: 'SOGEFRPP'
} as const;
