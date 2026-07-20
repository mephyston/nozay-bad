import { isSeasonClosed } from '@metacult/features-members-data-access';
import { SeasonClosedError } from '../../shared/errors';
import { UpdateSeasonBalancesRepository } from './repository';

export async function updateSeasonBalances(db: any, seasonId: string, body: { accountId: 'current' | 'savings' | 'cash'; initialBalance: number }[]) {
  if (await isSeasonClosed(db, seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de modifier ses soldes initiaux.');
  }
  const repo = new UpdateSeasonBalancesRepository();
  await repo.updateBalances(db, seasonId, body);
}
