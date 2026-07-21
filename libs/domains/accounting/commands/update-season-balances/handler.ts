import { isSeasonClosed } from '@metacult/features-members-api';
import { SeasonClosedError } from '../../shared/errors';
import { UpdateSeasonBalancesRepository } from './repository';
import { UpdateSeasonBalancesSeasonId, UpdateSeasonBalancesInput, UpdateSeasonBalancesOutput } from "./dto";

export async function updateSeasonBalances(db: any, seasonId: UpdateSeasonBalancesSeasonId, body: UpdateSeasonBalancesInput): Promise<UpdateSeasonBalancesOutput> {
  if (await isSeasonClosed(db, seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de modifier ses soldes initiaux.');
  }
  const repo = new UpdateSeasonBalancesRepository();
  await repo.updateBalances(db, seasonId, body);
}
