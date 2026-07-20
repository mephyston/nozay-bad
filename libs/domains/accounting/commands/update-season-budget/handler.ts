import { isSeasonClosed } from '@metacult/features-members-data-access';
import { SeasonClosedError } from '../../shared/errors';
import { UpdateSeasonBudgetRepository } from './repository';

export async function updateSeasonBudget(db: any, seasonId: string, body: { categoryId: number; type: 'recette' | 'depense'; amount: number }[]) {
  if (await isSeasonClosed(db, seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de modifier son prévisionnel.');
  }
  const repo = new UpdateSeasonBudgetRepository();
  return repo.updateBudget(db, seasonId, body);
}
