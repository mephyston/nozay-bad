import { type Db } from '@nba/db';
import { isUpcomingDate } from '../../shared/open-play';
import {
  NotTheOpenerError,
  OpenPlaySessionNotFoundError,
  OpenPlaySessionPassedError
} from '../../shared/errors';
import { ReleaseOpenPlaySessionRepository } from './repository';
import type { ReleaseOpenPlaySessionInput, ReleaseOpenPlaySessionOutput } from './dto';

/**
 * « Je ne peux plus ouvrir. »
 *
 * Réservé à l'ouvreur en place : on ne libère pas la séance d'un autre. Le bureau, lui,
 * le peut — par la mise à jour de la séance, qui est son outil.
 *
 * Refusé une fois la séance passée : se rétracter après coup n'a pas de sens, et
 * effacerait la trace de qui a réellement ouvert le gymnase ce soir-là.
 *
 * Les inscrits restent inscrits : ils n'ont rien fait de mal, et la séance redevient
 * simplement « à pourvoir » si le seuil tient toujours.
 */
export async function releaseOpenPlaySession(
  db: Db,
  input: ReleaseOpenPlaySessionInput,
  now: Date = new Date()
): Promise<ReleaseOpenPlaySessionOutput> {
  const repo = new ReleaseOpenPlaySessionRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new OpenPlaySessionNotFoundError();
  if (!isUpcomingDate(session.date, now)) throw new OpenPlaySessionPassedError();

  const released = await repo.release(db, session.id, input.licence.trim(), now);
  if (!released) throw new NotTheOpenerError();

  return released;
}
