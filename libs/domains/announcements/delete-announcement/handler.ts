import { type Db } from '@nba/db';
import { DeleteAnnouncementRepository } from './repository';
import { AnnouncementNotFoundError } from '../shared/errors';
import type { DeleteAnnouncementOutput } from './dto';

export async function deleteAnnouncement(db: Db, id: number): Promise<DeleteAnnouncementOutput> {
  const repo = new DeleteAnnouncementRepository();
  // Suppression franche : une annonce n'est pas une pièce comptable, rien ne s'y rattache.
  // On vérifie tout de même son existence pour distinguer un 404 d'une suppression réussie.
  const existing = await repo.findById(db, id);
  if (!existing) throw new AnnouncementNotFoundError();

  await repo.delete(db, id);
  return { id };
}
