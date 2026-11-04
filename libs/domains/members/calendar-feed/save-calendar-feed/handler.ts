import { AppError, type DbOrTx } from '@nba/db';
import { SaveCalendarFeedRepository } from './repository';
import type { SaveCalendarFeedInput, SaveCalendarFeedOutput } from './dto';

const repo = new SaveCalendarFeedRepository();

/** Crée l'abonnement de la personne, ou le remplace : l'ancienne adresse cesse de valoir. */
export async function saveCalendarFeed(
  db: DbOrTx,
  input: SaveCalendarFeedInput,
  now: Date = new Date()
): Promise<SaveCalendarFeedOutput> {
  const personId = await repo.personIdOf(db, input.licence);
  if (!personId) throw new AppError('Adhérent introuvable.', 404);
  await repo.upsert(db, personId, input.tokenHash, now);
  return { createdAt: now };
}
