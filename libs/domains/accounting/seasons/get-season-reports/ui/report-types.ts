export interface CategoryTotal {
  type: 'recette' | 'depense';
  total: number;
}

export interface ReportData {
  arretedAu?: string;
  compteResultat: {
    totalRecettes: number;
    totalDepenses: number;
    netResult: number;
    categories: Record<string, CategoryTotal>;
  };
  bilanTrésorerie: {
    /** Code du compte, lu de `accounts` : plus une union figée depuis que les comptes sont des données. */
    accountId: string;
    /** Identifiant numérique du compte, celui que portent les écritures. */
    id?: number;
    /** Libellé du compte, lu de `accounts`. */
    label?: string;
    /** Compte de tiers (classe 4) : hors du total, présenté comme une somme due. */
    thirdParty?: boolean;
    /** Bons et chèques tiers en attente de remboursement : hors disponibilités. */
    receivable?: boolean;
    initialBalance: number;
    /** Solde COMPTABLE de fin de période. C'est lui qui se reporte à-nouveau. */
    finalBalance: number;
    /** Recettes saisies mais encore en coffre, sur ce compte. */
    inVaultCents: number;
    /** Dépenses saisies mais pas encore débitées, sur ce compte. */
    pendingDebitCents: number;
    /** Ce que le relevé de ce compte devrait afficher, déduit des seuls statuts. */
    bankTheoreticalCents: number;
    /** Ce que le relevé affiche vraiment. `null` tant qu'aucun n'a été importé. */
    statementBalanceCents: number | null;
    /** Date d'arrêté de ce relevé. Les deux soldes ne sont pas arrêtés au même jour. */
    statementDate: string | null;
  }[];
  tresorerieDisponible?: {
    totalGrossCashCents: number;
    inVaultCents: number;
    pendingDebitCents: number;
    deferredRevenues: { categoryName: string; amountCents: number }[];
    deferredExpenses: { categoryName: string; amountCents: number }[];
    netAvailableCashCents: number;
    /** Solde brut signé des comptes de tiers, hors des totaux ci-dessus. */
    thirdPartyGrossCents?: number;
    /** Ce que le club doit aux adhérents, rendu positif. */
    duesToThirdPartiesCents?: number;
  };
  projections?: {
    categories: any[];
    totalProjectedRecettes: number;
    totalProjectedDepenses: number;
    projectedNetResult: number;
    /*
      Les trois séries du moteur — total, compte courant, Livret A — chacune en réel
      et en projeté. Ce type annonçait `real` et `projected`, deux champs que
      `forecast-engine.ts` n'écrit plus depuis qu'il distingue les comptes : l'écart ne
      se voyait pas, les `.svelte` des bibliothèques de domaine n'étant pas vérifiés.
      Il se voit depuis que `treasury-forecast-row-model.ts` le lit en TypeScript.
    */
    treasuryForecast?: {
      month: string;
      label: string;
      realTotal: number | null;
      realCurrent: number | null;
      realSavings: number | null;
      projectedTotal: number | null;
      projectedCurrent: number | null;
      projectedSavings: number | null;
      projectedRecettes: number;
      projectedDepenses: number;
    }[];
  };
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed: boolean;
}

export interface DbCategory {
  id: number;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
  receiptCode?: string | null;
  expenseCode?: string | null;
  receiptAccountClassId?: number | null;
  expenseAccountClassId?: number | null;
}

export interface AccountClass {
  id?: number;
  code: string;
  label: string;
  type: 'recette' | 'depense';
}

export interface BudgetRecord {
  categoryId: number;
  type: 'recette' | 'depense';
  amount: number;
}
