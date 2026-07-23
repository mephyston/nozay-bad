import { type Db } from '@nba/db';
import { ListExpensesRepository } from './repository';
import { ListExpensesInput, ListExpensesOutput } from "./dto";

export async function listExpenses(
  db: Db,
  filters: ListExpensesInput
): Promise<ListExpensesOutput> {
  const repo = new ListExpensesRepository();
  return repo.list(db, filters);
}
