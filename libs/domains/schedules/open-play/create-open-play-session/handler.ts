import { type Db } from '@nba/db';
import { isOrderedRange } from '../../shared/slot';
import { DEFAULT_MIN_PLAYERS, isValidDate } from '../../shared/open-play';
import {
  InvalidSessionDateError,
  InvalidSlotTimesError,
  OpenPlaySessionAlreadyExistsError,
  VenueNotFoundError
} from '../../shared/errors';
import { CreateOpenPlaySessionRepository } from './repository';
import type { CreateOpenPlaySessionInput, CreateOpenPlaySessionOutput } from './dto';

/**
 * Ouvre une séance de jeu libre à une date.
 *
 * Le cas courant est celui que la grille hebdomadaire ne couvre pas : un samedi de
 * vacances, un jour férié. La séance naît sans ouvreur — c'est l'affluence qui décidera
 * s'il en faut un.
 */
export async function createOpenPlaySession(
  db: Db,
  input: CreateOpenPlaySessionInput,
  now: Date = new Date()
): Promise<CreateOpenPlaySessionOutput> {
  const repo = new CreateOpenPlaySessionRepository();

  // Le format est déjà validé à la route ; ce qui se joue ici, c'est le 31 février,
  // qu'aucune expression régulière ne rattrape.
  if (!isValidDate(input.date)) throw new InvalidSessionDateError();
  // Une séance qui finit avant de commencer s'affiche sans erreur et fausse le tableau.
  if (!isOrderedRange(input.startTime, input.endTime)) throw new InvalidSlotTimesError();
  if (!(await repo.findVenue(db, input.venueId))) throw new VenueNotFoundError();

  const session = await repo.insertIfAbsent(db, {
    seasonCode: input.seasonCode,
    venueId: input.venueId,
    slotId: null,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    minPlayers: input.minPlayers ?? DEFAULT_MIN_PLAYERS,
    status: 'open',
    label: input.label?.trim() || null,
    notes: input.notes?.trim() || null,
    createdAt: now,
    updatedAt: now
  });

  // Rien en retour = la clé naturelle existait déjà. Le dire, plutôt que de rendre
  // silencieusement la séance en place : le bureau croirait avoir créé la sienne, avec
  // les horaires qu'il vient de saisir, alors qu'il regarde ceux d'une autre.
  if (!session) throw new OpenPlaySessionAlreadyExistsError();

  return session;
}
