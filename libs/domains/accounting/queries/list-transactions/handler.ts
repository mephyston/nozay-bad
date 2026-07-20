import { ListTransactionsRepository } from './repository';
import type { ListTransactionsFilters, Pagination } from './dto';

export async function listTransactions(
  db: any,
  filters: ListTransactionsFilters,
  pagination: Pagination
) {
  const repo = new ListTransactionsRepository();
  const offset = (pagination.page - 1) * pagination.limit;

  const total = await repo.count(db, filters);
  const data = await repo.list(db, filters, { limit: pagination.limit, offset });

  return {
    data,
    pagination: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit) || 1
    }
  };
}
