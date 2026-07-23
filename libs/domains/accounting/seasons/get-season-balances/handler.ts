import { type Db } from '@nba/db';
import { GetSeasonBalancesRepository } from './repository';
import { GetSeasonBalancesInput, GetSeasonBalancesOutput } from "./dto";

export async function getSeasonBalances(db: Db, seasonId: GetSeasonBalancesInput): Promise<GetSeasonBalancesOutput> {
  const repo = new GetSeasonBalancesRepository();
  return repo.getBalances(db, seasonId);
}
