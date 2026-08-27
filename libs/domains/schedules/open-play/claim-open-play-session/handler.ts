import { type Db } from '@nba/db';
import { seasonCodeForDate } from '../../shared/season';
import { isUpcomingDate } from '../../shared/open-play';
import {
  NotAnOpenerError,
  OpenPlaySessionCancelledError,
  OpenPlaySessionNotFoundError,
  OpenPlaySessionPassedError,
  SessionAlreadyClaimedError
} from '../../shared/errors';
import { ClaimOpenPlaySessionRepository } from './repository';
import type { ClaimOpenPlaySessionInput, ClaimOpenPlaySessionOutput } from './dto';

/**
 * « J'ouvre ce créneau. »
 *
 * Le geste qui remplace la recherche de bénévole par SMS. Le refus « vous n'êtes pas
 * ouvreur » est rendu **ici** et non par l'écran : c'est ce qui le rend incontournable,
 * un navigateur qui forgerait la requête se faisant refuser tout de même.
 *
 * L'identité est recopiée sur la séance parce qu'elle y devient une trace : retirer plus
 * tard cette personne de la liste des ouvreurs ne doit pas effacer son nom des séances
 * qu'elle a tenues.
 */
export async function claimOpenPlaySession(
  db: Db,
  input: ClaimOpenPlaySessionInput,
  now: Date = new Date()
): Promise<ClaimOpenPlaySessionOutput> {
  const repo = new ClaimOpenPlaySessionRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new OpenPlaySessionNotFoundError();
  if (session.status === 'cancelled') throw new OpenPlaySessionCancelledError();
  if (!isUpcomingDate(session.date, now)) throw new OpenPlaySessionPassedError();

  const licence = input.licence.trim();
  // La séance est datée ; la liste d'ouvreurs qui s'applique est celle de sa saison.
  if (!(await repo.isOpener(db, seasonCodeForDate(session.date), licence))) {
    throw new NotAnOpenerError();
  }

  const claimed = await repo.claim(db, session.id, {
    licence,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    now
  });

  // Aucune ligne modifiée : quelqu'un d'autre tient déjà la séance. Le verrou a joué.
  if (!claimed) throw new SessionAlreadyClaimedError();

  return claimed;
}
