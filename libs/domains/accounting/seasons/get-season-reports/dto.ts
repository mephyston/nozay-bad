export type GetSeasonReportsInput = string | {
  seasonId: string | number;
  arretedAu?: string | null;
};

/**
 * Une **catégorie** de régularisation, et non une écriture.
 *
 * L'encart listait une ligne par écriture : une rentrée de cotisations payées d'avance
 * y déroulait cinquante fois « Adhésions & Inscriptions », pour un total qu'il fallait
 * faire de tête. Le lecteur d'un compte de résultat veut le montant par catégorie ;
 * le détail, c'est le grand livre qui le donne.
 */
export interface DeferredCashBreakdown {
  categoryId: number;
  categoryName: string;
  amountCents: number;
  /** Nombre d'écritures regroupées, pour que le total reste vérifiable. */
  count: number;
}

export interface ForecastDataPoint {
  month: string; // YYYY-MM
  label: string;
  realTotal: number | null;
  realCurrent: number | null;
  realSavings: number | null;
  projectedTotal: number | null;
  projectedCurrent: number | null;
  projectedSavings: number | null;
  projectedRecettes: number;
  projectedDepenses: number;
}

export interface CategoryProjection {
  categoryId: number;
  categoryName: string;
  type: 'recette' | 'depense';
  realisedCents: number;
  budgetCents: number;
  remainingBudgetCents: number;
  projectedCents: number;
  isUnbudgeted: boolean;
}

export type GetSeasonReportsOutput = {
  arretedAu?: string | null;
  season?: {
    id: number;
    code: string;
    name: string;
    startDate: string;
    endDate: string;
    closedAt: number | null;
  };
  compteResultat: {
    totalRecettes: number;
    totalDepenses: number;
    netResult: number;
    categories: Record<string, { type: 'recette' | 'depense'; total: number; categoryName?: string }>;
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
    totalDeferredRevenueCents: number;
    totalDeferredExpensesCents: number;
    netAvailableCashCents: number;
    deferredRevenues: DeferredCashBreakdown[];
    deferredExpenses: DeferredCashBreakdown[];
  };
  projections?: {
    categories: CategoryProjection[];
    totalProjectedRecettes: number;
    totalProjectedDepenses: number;
    projectedNetResult: number;
    treasuryForecast?: ForecastDataPoint[];
  };
};
