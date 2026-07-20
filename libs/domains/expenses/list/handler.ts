import { ListExpensesRepository } from './repository';

export async function listExpenses(
  db: any,
  filters: { season?: string; status?: string }
) {
  const repo = new ListExpensesRepository();
  return repo.list(db, filters);
}
