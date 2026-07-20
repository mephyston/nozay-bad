import { AppError } from '@metacult/shared-db';
import { CloseSeasonRepository } from './repository';
import { CloseSeasonInput, CloseSeasonOutput } from "./dto";

export async function closeSeason(db: any, id: CloseSeasonInput): Promise<CloseSeasonOutput> {
  const repo = new CloseSeasonRepository();
  const updated = await repo.updateSeason(db, id, { closed: true });
  if (!updated) {
    throw new AppError('Saison introuvable', 404);
  }
  return updated;
}
