export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
  initialCurrentBalance?: number;
  initialSavingsBalance?: number;
  initialCashBalance?: number;
}

export interface Category {
  id: number;
  code: string;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
  receiptCode?: string | null;
  expenseCode?: string | null;
}

export interface AccountClass {
  code: string;
  label: string;
  type: 'recette' | 'depense';
}
