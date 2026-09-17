/** Une écriture d'un compte sans relevé, telle que l'API du grand livre la projette. */
export interface AccountEntry {
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
  /** Libellé de la catégorie (l'API projette `categories.admin_label`) ; `null` pour un virement. */
  category: string | null;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
  reference: string | null;
  /** L'adhérent rattaché à une recette, tel que l'API le nomme ; absent pour une écriture générale. */
  memberName?: string | null;
  memberLicence?: string | null;
}

export interface Season {
  id: string | number;
  code?: string;
  name: string;
  active: boolean;
  closed?: boolean;
  startDate?: string;
  endDate?: string;
}

/** Le compte que l'écran affiche, tel que le relais le lit de `accounts`. */
export interface ScreenAccount {
  id?: number;
  code: string;
  label: string;
  /** Compte de tiers (classe 4) : son solde est une dette envers les adhérents, pas de la trésorerie. */
  thirdParty: boolean;
  /** Nature du compte (`bank`, `cash`, `wallet`, `third_party`), qui choisit les gestes proposés. */
  kind?: string;
}

export interface CategoryOption {
  id: number | string;
  code?: string;
  adminLabel: string;
  active?: boolean;
}
