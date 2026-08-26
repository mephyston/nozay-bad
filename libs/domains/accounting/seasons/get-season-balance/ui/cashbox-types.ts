export interface CashTransaction {
  id: number;
  type: 'recette' | 'depense' | 'transfert';
  /*
   * L'identifiant **numérique** du compte, tel que l'API le projette.
   *
   * Ce champ était déclaré `'current' | 'savings' | 'cash'` alors que le repository projette
   * `ledger_entries.account_id`, c'est-à-dire un entier. Le type mentait, TypeScript n'avait donc
   * rien à signaler, et le composant comparait `3 === 'cash'` — toujours faux. Résultat : les
   * virements ne comptaient dans aucun total, et le solde de la caisse était faux dès le premier
   * dépôt d'espèces, c'est-à-dire dès le geste que le centre d'aide recommande.
   */
  accountId: number;
  /** De quel côté du virement se tient cette écriture ; `null` pour une recette ou une dépense. */
  transferLeg: 'source' | 'destination' | null;
  /** Le compte d'en face, lu sur la jambe jumelle. */
  counterpartAccountId: number | null;
  category: string | null;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
  reference: string | null;
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export const categoryLabels: Record<string, string> = {
  evenements_buvettes: 'Événements & Buvette',
  evenements_club: 'Événements & Buvette',
  boutique: 'Boutique & Cordages',
  adhesions_inscriptions: 'Adhésion',
  volants: 'Volants',
  materiel_club: 'Matériel club',
  divers_recette: 'Divers Recette',
  divers_depense: 'Divers Dépense'
};
