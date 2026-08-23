import { type Db } from '@nba/db';
import { isOrderedRange } from '../../shared/slot';
import { isValidDate } from '../../shared/open-play';
import {
  InvalidSessionDateError,
  InvalidSlotTimesError,
  MissingCancellationReasonError,
  MissingOpenerError,
  NotAnOpenerError,
  OpenPlaySessionNotFoundError,
  VenueNotFoundError
} from '../../shared/errors';
import { UpdateOpenPlaySessionRepository } from './repository';
import type { UpdateOpenPlaySessionInput, UpdateOpenPlaySessionOutput } from './dto';

/**
 * L'outil du bureau : corriger une séance, désigner son ouvreur, l'annuler.
 *
 * Cette tranche est le seul endroit où l'ouvreur se pose autrement que par le bouton de
 * l'adhérent — le cas réel étant celui du bénévole qui a dit oui par SMS. Elle porte donc
 * l'invariant du domaine : **`confirmed` si et seulement si un ouvreur est renseigné**.
 */
export async function updateOpenPlaySession(
  db: Db,
  input: UpdateOpenPlaySessionInput,
  now: Date = new Date()
): Promise<UpdateOpenPlaySessionOutput> {
  const repo = new UpdateOpenPlaySessionRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new OpenPlaySessionNotFoundError();

  if (input.date !== undefined && !isValidDate(input.date)) throw new InvalidSessionDateError();

  const startTime = input.startTime ?? session.startTime;
  const endTime = input.endTime ?? session.endTime;
  if (!isOrderedRange(startTime, endTime)) throw new InvalidSlotTimesError();

  if (input.venueId !== undefined && !(await repo.findVenue(db, input.venueId))) {
    throw new VenueNotFoundError();
  }

  // Désigner quelqu'un hors de la liste des ouvreurs ferait de cette liste une
  // décoration : le bureau désigne PARMI ses détenteurs de clé.
  if (input.openerLicence) {
    const eligible = await repo.isOpener(db, session.seasonCode, input.openerLicence);
    if (!eligible) throw new NotAnOpenerError();
  }

  const values: Partial<typeof session> = { updatedAt: now };
  const assign = <K extends keyof UpdateOpenPlaySessionInput>(key: K) => {
    if (input[key] !== undefined) (values as Record<string, unknown>)[key] = input[key];
  };
  (['date', 'venueId', 'startTime', 'endTime', 'minPlayers', 'label', 'notes'] as const).forEach(
    assign
  );

  // Retirer l'ouvreur rouvre la séance : les deux vont toujours ensemble, c'est ce qui
  // tient l'invariant.
  if (input.openerLicence !== undefined) {
    values.openerLicence = input.openerLicence;
    values.openerFirstName = input.openerLicence ? (input.openerFirstName ?? null) : null;
    values.openerLastName = input.openerLicence ? (input.openerLastName ?? null) : null;
    values.openedAt = input.openerLicence ? now : null;
    values.status = input.openerLicence ? 'confirmed' : 'open';
  }

  if (input.status !== undefined) {
    if (input.status === 'confirmed' && !(values.openerLicence ?? session.openerLicence)) {
      throw new MissingOpenerError();
    }
    if (input.status === 'cancelled') {
      const reason = input.cancelledReason ?? session.cancelledReason;
      // L'adhérent inscrit verra la séance barrée : il doit lire pourquoi il ne joue pas.
      if (!reason?.trim()) throw new MissingCancellationReasonError();
      values.cancelledReason = reason.trim();
    }
    values.status = input.status;
  } else if (input.cancelledReason !== undefined) {
    values.cancelledReason = input.cancelledReason;
  }

  // Rouvrir efface le motif : le garder ferait lire « annulée : gymnase fermé » sous une
  // séance qui accepte de nouveau des inscriptions.
  if (values.status && values.status !== 'cancelled') values.cancelledReason = null;

  return repo.update(db, session.id, values);
}
