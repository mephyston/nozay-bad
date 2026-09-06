/** Le solde initial d'un compte de trésorerie, tel que le relais l'aplatit par exercice. */
export interface SeasonInitialBalance {
  /** Code du compte (`current`, `badnet`…), ce que l'API attend à l'écriture. */
  accountId: string;
  label: string;
  /** Compte de tiers (classe 4) : le solde saisi est une dette, normalement nulle ou négative. */
  thirdParty?: boolean;
  initialBalanceCents: number;
}

export interface Season {
  id: string;
  code?: string;
  name: string;
  active: boolean;
  closed?: boolean;
  /** Un solde par compte, dans l'ordre des comptes — plus trois champs figés. */
  initialBalances?: SeasonInitialBalance[];
  /** Vrai quand les soldes viennent du bilan de l'exercice précédent, pas d'une saisie. */
  isAutoFilled?: boolean;
}

export interface Category {
  id: number;
  code: string;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
  active?: boolean;
  receiptCode?: string | null;
  expenseCode?: string | null;
}

export interface AccountClass {
  code: string;
  label: string;
  type: 'recette' | 'depense' | 'tresorerie';
}

/** Un compte de trésorerie du club, avec la classe qui le porte (projection de `GET /accounting/accounts`). */
export interface TreasuryAccount {
  id: number;
  code: string;
  label: string;
  classCode: string;
  classType: 'recette' | 'depense' | 'tresorerie';
}

export interface ProductCategory {
  id: number;
  label: string;
  accountingCategoryId: number;
  active: boolean;
  createdAt: string;
}
