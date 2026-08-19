import { type Db } from '@nba/db';
import { ClubEventNotFoundError, RegistrationsNotOpenError } from '../shared/errors';
import { UnregisterFromEventRepository } from './repository';
import type { UnregisterFromEventInput, UnregisterFromEventOutput } from './dto';

/**
 * Retire l'inscription d'un adhérent.
 *
 * Réservé aux inscriptions **ouvertes** : une fois closes, la liste est arrêtée et
 * seul le bureau y touche. Le club a commandé les parts de tartiflette, se décommander
 * relève alors de la conversation, pas du formulaire.
 *
 * Volontairement tolérant sur l'absence : se désinscrire deux fois, ou se désinscrire
 * sans l'avoir été, n'est pas une erreur. L'appelant demande un état — « je ne viens
 * pas » — et cet état est atteint dans les deux cas.
 */
export async function unregisterFromEvent(
  db: Db,
  input: UnregisterFromEventInput
): Promise<UnregisterFromEventOutput> {
  const repo = new UnregisterFromEventRepository();

  const event = await repo.findEvent(db, input.eventId);
  if (!event) throw new ClubEventNotFoundError();
  if (event.registration !== 'open') throw new RegistrationsNotOpenError();

  return { removed: await repo.remove(db, event.id, input.memberId) };
}
