import { type Db } from '@nba/db';
import { GetSeasonBudgetRepository } from './repository';
import { GetSeasonBudgetInput, GetSeasonBudgetOutput } from "./dto";

export async function getSeasonBudget(db: Db, seasonId: GetSeasonBudgetInput): Promise<GetSeasonBudgetOutput> {
  const repo = new GetSeasonBudgetRepository();
  return repo.getBudget(db, seasonId);
}
