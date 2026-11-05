/** La personne au nom de laquelle un agenda se compose. */
export interface CalendarProfile {
  licence: string;
  firstName: string;
  /**
   * L'adhésion de la saison en cours, ou `null` hors adhésion.
   *
   * `null` donne un flux vide et non un refus : l'abonnement reprend tout seul si la
   * personne se réinscrit, et un agenda qui reçoit une erreur garderait d'anciens
   * rendez-vous affichés.
   */
  membership: { memberId: number; seasonCode: string } | null;
}
