import { type Db } from '@nba/db';
import { isUpcoming } from '../shared/event';
import {
  ClubEventNotFoundError,
  EventAlreadyPassedError,
  RegistrationsNotOpenError
} from '../shared/errors';
import { RegisterToEventRepository } from './repository';
import type { RegisterToEventInput, RegisterToEventOutput } from './dto';

/**
 * Inscrit un adhérent à un événement.
 *
 * Trois refus, dans cet ordre : l'événement n'existe pas, il n'accepte pas
 * d'inscription, il est passé. Ils sont vérifiés **ici** et non à l'affichage, parce
 * qu'un écran ouvert depuis une heure ne dit plus l'état réel : entre le moment où
 * l'adhérent a vu le bouton et celui où il clique, le bureau a pu fermer.
 *
 * Un événement en brouillon ou annulé n'est pas inscriptible non plus, quel que soit
 * l'état de ses inscriptions — il n'est pas censé être visible.
 */
export async function registerToEvent(
  db: Db,
  input: RegisterToEventInput,
  now: Date = new Date()
): Promise<RegisterToEventOutput> {
  const repo = new RegisterToEventRepository();

  const event = await repo.findEvent(db, input.eventId);
  if (!event) throw new ClubEventNotFoundError();
  if (event.status !== 'published' || event.registration !== 'open') {
    throw new RegistrationsNotOpenError();
  }
  if (!isUpcoming(event.startsAt, now)) throw new EventAlreadyPassedError();

  return repo.upsert(db, {
    eventId: event.id,
    memberId: input.memberId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    guests: input.guests ?? 0,
    createdAt: now,
    updatedAt: now
  });
}
