import { GetSeasonBalancesRepository } from './repository';

export async function getSeasonBalances(db: any, seasonId: string) {
  const repo = new GetSeasonBalancesRepository();
  return repo.getBalances(db, seasonId);
}
