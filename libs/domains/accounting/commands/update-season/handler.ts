import { AppError, type Db } from '@metacult/shared-db';
import { UpdateSeasonRepository } from './repository';
import { UpdateSeasonId, UpdateSeasonInput, UpdateSeasonOutput } from "./dto";

export async function updateSeason(db: Db, id: UpdateSeasonId, body: UpdateSeasonInput): Promise<UpdateSeasonOutput> {
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
