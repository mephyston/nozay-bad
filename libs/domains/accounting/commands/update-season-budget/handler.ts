import { type Db } from '@nba/db';
import { isSeasonClosed } from '@nba/members-api';
import { SeasonClosedError } from '../../shared/errors';
import { UpdateSeasonBudgetRepository } from './repository';
import { UpdateSeasonBudgetSeasonId, UpdateSeasonBudgetInput, UpdateSeasonBudgetOutput } from "./dto";

export async function updateSeasonBudget(db: Db, seasonId: UpdateSeasonBudgetSeasonId, body: UpdateSeasonBudgetInput): Promise<UpdateSeasonBudgetOutput> {
  if (await isSeasonClosed(db, seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de modifier son prévisionnel.');
  }
  const repo = new UpdateSeasonBudgetRepository();
  return repo.updateBudget(db, seasonId, body);
}
