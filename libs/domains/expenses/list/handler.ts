import { DrizzleExpenseRepository } from '@metacult/features-expenses-data-access';

export async function listExpenses(
  db: any,
  filters: { season?: string; status?: string }
) {
  const repo = new DrizzleExpenseRepository();
  return repo.list(db, filters);
}
