import { type Db } from '@nba/db';
import { ClubEventNotFoundError } from '../shared/errors';
import { DeleteEventRepository } from './repository';
import type { DeleteEventInput, DeleteEventOutput } from './dto';

/**
 * Supprime un événement.
 *
 * Réservé aux saisies erronées : pour un événement annulé, le statut `cancelled` vaut
 * mieux — il conserve la page et l'information pour qui comptait s'y rendre.
 */
export async function deleteEvent(db: Db, input: DeleteEventInput): Promise<DeleteEventOutput> {
  const repo = new DeleteEventRepository();
  if (!(await repo.findById(db, input.eventId))) throw new ClubEventNotFoundError();
  await repo.remove(db, input.eventId);
  return { deleted: true };
}
