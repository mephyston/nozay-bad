export interface ListTransactionsFilters {
  seasonId?: string;
  accountId?: string;
  type?: string;
  category?: string;
  classCode?: string;
  memberId?: string;
  unreconciledChequesOnly?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
}
