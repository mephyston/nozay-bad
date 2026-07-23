import { AppError, type Db } from '@nba/db';
import { CloseSeasonRepository, CloseSeasonRepositoryInterface } from './repository';
import { CloseSeasonInput, CloseSeasonOutput } from "./dto";
import { Season } from '../../shared/season';

export async function closeSeason(
  db: Db,
  id: CloseSeasonInput,
  repo: CloseSeasonRepositoryInterface = new CloseSeasonRepository()
): Promise<CloseSeasonOutput> {
  const seasonData = await repo.getSeasonById(db, id as unknown as string);
  if (!seasonData) {
    throw new AppError('Saison introuvable', 404);
  }
  
  const season = new Season(seasonData);
  if (season.isClosed()) {
    throw new AppError('Saison déjà clôturée', 400);
  }

  const updated = await repo.updateSeason(db, id as unknown as string, { closed: true });
  return updated;
}
