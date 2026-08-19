import { type Db } from '@nba/db';
import { sanitizeRichText, CMS_PROFILE } from '@nba/html';
import { isOrderedRange } from '../shared/event';
import { ClubEventNotFoundError, InvalidEventDatesError } from '../shared/errors';
import { UpdateEventRepository } from './repository';
import type { UpdateEventInput, UpdateEventOutput } from './dto';

/**
 * Modifie un événement.
 *
 * Le slug reste figé : une compétition annoncée est partagée par lien, et son adresse
 * ne doit pas bouger. Annuler se fait par le statut `cancelled` plutôt que par une
 * suppression — la page reste alors accessible et porte l'information, ce qui est
 * exactement ce que cherche quelqu'un qui s'était déplacé pour l'occasion.
 */
export async function updateEvent(db: Db, input: UpdateEventInput, now: Date = new Date()): Promise<UpdateEventOutput> {
  const repo = new UpdateEventRepository();

  const event = await repo.findById(db, input.eventId);
  if (!event) throw new ClubEventNotFoundError();

  const startsAt = input.startsAt ?? event.startsAt;
  const endsAt = input.endsAt === undefined ? event.endsAt : input.endsAt;
  if (!isOrderedRange(startsAt, endsAt)) throw new InvalidEventDatesError();

  return repo.update(db, event.id, {
    category: input.category ?? event.category,
    title: input.title ?? event.title,
    startsAt,
    endsAt,
    venueLabel: input.venueLabel === undefined ? event.venueLabel : input.venueLabel,
    descriptionHtml:
      input.descriptionHtml === undefined
        ? event.descriptionHtml
        : sanitizeRichText(input.descriptionHtml, CMS_PROFILE),
    status: input.status ?? event.status,
    registration: input.registration ?? event.registration,
    updatedAt: now
  });
}
