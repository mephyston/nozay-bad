import { type Db, AppError } from '@nba/db';
import { isSeasonClosed } from '@nba/members-api';
import { SeasonClosedError } from '../../shared/errors';
import { UpdateSeasonBalancesRepository } from './repository';
import { UpdateSeasonBalancesSeasonId, UpdateSeasonBalancesInput, UpdateSeasonBalancesOutput } from "./dto";

export async function updateSeasonBalances(db: Db, seasonId: UpdateSeasonBalancesSeasonId, body: UpdateSeasonBalancesInput): Promise<UpdateSeasonBalancesOutput> {
  if (await isSeasonClosed(db, seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de modifier ses soldes initiaux.');
  }

  const repo = new UpdateSeasonBalancesRepository();
  const numericSeasonId = await repo.resolveSeasonId(db, seasonId);
  if (!numericSeasonId) {
    throw new AppError('Saison introuvable', 404);
  }

  await repo.updateBalances(db, numericSeasonId, body);
}

