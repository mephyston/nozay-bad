import { AppError } from '@metacult/shared-db';
import { UpdateSeasonRepository } from './repository';

export async function updateSeason(db: any, id: string, body: { name?: string; active?: boolean; closed?: boolean }) {
  const repo = new UpdateSeasonRepository();
  if (body.active) {
    await repo.deactivateAllSeasonsExcept(db, id);
  }
  const updated = await repo.updateSeason(db, id, body);
  if (!updated) {
    throw new AppError('Saison introuvable', 404);
  }
  return updated;
}
