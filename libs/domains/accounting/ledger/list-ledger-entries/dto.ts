export interface ListTransactionsFilters {
  seasonId?: string;
  accountId?: string;
  type?: string;
  category?: string;
  classCode?: string;
  memberId?: string;
  unreconciledChequesOnly?: boolean;
  search?: string;
  month?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  /**
   * Le solde progressif et le compte d'en face, deux colonnes calculées par des sous-requêtes
   * corrélées. Seul le grand livre les affiche ; les autres appelants gagnent à les refuser.
   * Défaut : `true`.
   */
  runningBalance?: boolean;
}
