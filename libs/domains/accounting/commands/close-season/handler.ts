import { AppError } from '@metacult/shared-db';
import { CloseSeasonRepository } from './repository';

export async function closeSeason(db: any, id: string) {
  const repo = new CloseSeasonRepository();
  const updated = await repo.updateSeason(db, id, { closed: true });
  if (!updated) {
    throw new AppError('Saison introuvable', 404);
  }
  return updated;
}
