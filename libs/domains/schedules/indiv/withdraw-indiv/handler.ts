import { type Db } from '@nba/db';
import { IndivSessionNotFoundError } from '../../shared/errors';
import { WithdrawIndivRepository } from './repository';
import type { WithdrawIndivInput, WithdrawIndivOutput } from './dto';

/**
 * Retire la candidature d'un compétiteur.
 *
 * Un seul refus : la soirée doit exister. Se retirer reste possible après l'annonce —
 * un retenu qui a un empêchement doit pouvoir le dire, et c'est précisément ce que
 * l'entraîneur a besoin de savoir pour donner la place à quelqu'un d'autre. Tolérant à
 * l'absence : se retirer deux fois n'est pas une erreur, l'état demandé est atteint.
 */
export async function withdrawIndiv(db: Db, input: WithdrawIndivInput): Promise<WithdrawIndivOutput> {
  const repo = new WithdrawIndivRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new IndivSessionNotFoundError();

  return { removed: await repo.remove(db, session.id, input.memberId) };
}
