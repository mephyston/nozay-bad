import { GetSeasonBalancesRepository } from './repository';
import { GetSeasonBalancesInput, GetSeasonBalancesOutput } from "./dto";

export async function getSeasonBalances(db: any, seasonId: GetSeasonBalancesInput): Promise<GetSeasonBalancesOutput> {
  const repo = new GetSeasonBalancesRepository();
  return repo.getBalances(db, seasonId);
}
