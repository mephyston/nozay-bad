import { GetSeasonBudgetRepository } from './repository';

export async function getSeasonBudget(db: any, seasonId: string) {
  const repo = new GetSeasonBudgetRepository();
  return repo.getBudget(db, seasonId);
}
