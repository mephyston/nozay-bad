import { GetSeasonBudgetRepository } from './repository';
import { GetSeasonBudgetInput, GetSeasonBudgetOutput } from "./dto";

export async function getSeasonBudget(db: any, seasonId: GetSeasonBudgetInput): Promise<GetSeasonBudgetOutput> {
  const repo = new GetSeasonBudgetRepository();
  return repo.getBudget(db, seasonId);
}
