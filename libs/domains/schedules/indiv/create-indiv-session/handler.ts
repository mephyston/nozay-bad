import { type Db } from '@nba/db';
import { isValidDate } from '../../shared/open-play';
import {
  DEFAULT_CAPACITY_PER_SLOT,
  DEFAULT_SLOT_COUNT,
  DEFAULT_SLOT_MINUTES,
  isValidLayout
} from '../../shared/indiv';
import {
  IndivSessionAlreadyExistsError,
  InvalidIndivLayoutError,
  InvalidSessionDateError,
  VenueNotFoundError
} from '../../shared/errors';
import { CreateIndivSessionRepository } from './repository';
import type { CreateIndivSessionInput, CreateIndivSessionOutput } from './dto';

/**
 * Ouvre une soirée d'indiv à une date.
 *
 * Le cas courant est la génération en lot depuis le créneau compétiteurs ; celle-ci sert
 * la soirée hors grille — un stage, une veille de vacances — ou une correction.
 */
export async function createIndivSession(
  db: Db,
  input: CreateIndivSessionInput,
  now: Date = new Date()
): Promise<CreateIndivSessionOutput> {
  const repo = new CreateIndivSessionRepository();

  const layout = {
    startTime: input.startTime,
    slotCount: input.slotCount ?? DEFAULT_SLOT_COUNT,
    slotMinutes: input.slotMinutes ?? DEFAULT_SLOT_MINUTES
  };

  // Le format est validé à la route ; ici se jouent le 31 février et la soirée qui
  // franchirait minuit, que les expressions régulières laissent passer.
  if (!isValidDate(input.date)) throw new InvalidSessionDateError();
  if (!isValidLayout(layout)) throw new InvalidIndivLayoutError();
  if (!(await repo.findVenue(db, input.venueId))) throw new VenueNotFoundError();

  const session = await repo.insertIfAbsent(db, {
    venueId: input.venueId,
    slotId: null,
    date: input.date,
    startTime: input.startTime,
    slotCount: layout.slotCount,
    slotMinutes: layout.slotMinutes,
    capacityPerSlot: input.capacityPerSlot ?? DEFAULT_CAPACITY_PER_SLOT,
    status: 'open',
    label: input.label?.trim() || null,
    notes: input.notes?.trim() || null,
    createdAt: now,
    updatedAt: now
  });

  // Rien en retour = la clé naturelle existait déjà. Le dire, plutôt que de rendre la
  // soirée en place avec d'autres réglages que ceux que l'entraîneur vient de saisir.
  if (!session) throw new IndivSessionAlreadyExistsError();

  return session;
}
