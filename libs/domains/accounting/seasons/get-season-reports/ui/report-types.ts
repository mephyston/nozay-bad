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
    accountId: 'current' | 'savings' | 'cash';
    initialBalance: number;
    finalBalance: number;
  }[];
  tresorerieDisponible?: {
    totalGrossCashCents: number;
    inVaultCents: number;
    pendingDebitCents: number;
    deferredRevenues: { categoryName: string; amountCents: number }[];
    deferredExpenses: { categoryName: string; amountCents: number }[];
    netAvailableCashCents: number;
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
