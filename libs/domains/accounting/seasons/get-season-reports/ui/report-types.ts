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
    initialBalance: number;
    /** Solde COMPTABLE de fin de période. C'est lui qui se reporte à-nouveau. */
    finalBalance: number;
    /** Recettes saisies mais encore en coffre, sur ce compte. */
    inVaultCents: number;
    /** Dépenses saisies mais pas encore débitées, sur ce compte. */
    pendingDebitCents: number;
    /** Ce que le relevé de ce compte devrait afficher. */
    bankTheoreticalCents: number;
  }[];
  tresorerieDisponible?: {
    totalGrossCashCents: number;
    inVaultCents: number;
    pendingDebitCents: number;
    deferredRevenues: { categoryName: string; amountCents: number }[];
    deferredExpenses: { categoryName: string; amountCents: number }[];
    netAvailableCashCents: number;
  };
  projections?: {
    categories: any[];
    totalProjectedRecettes: number;
    totalProjectedDepenses: number;
    projectedNetResult: number;
    treasuryForecast?: {
      month: string;
      label: string;
      real: number | null;
      projected: number | null;
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
