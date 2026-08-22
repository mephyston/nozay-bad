import { type Db } from '@nba/db';
import { OpenPlaySessionNotFoundError } from '../../shared/errors';
import { UnregisterFromOpenPlayRepository } from './repository';
import type { UnregisterFromOpenPlayInput, UnregisterFromOpenPlayOutput } from './dto';

/**
 * Retire l'inscription d'un adhérent, et les invités qu'il annonçait.
 *
 * Un seul refus : la séance doit exister. Différence délibérée avec la désinscription
 * d'un événement, qui refuse quand les inscriptions sont closes parce que « le club a
 * commandé les parts de tartiflette ». Ici rien n'est engagé, et « je ne viens pas » est
 * précisément ce que le bénévole a besoin de savoir — y compris sur une séance annulée,
 * où l'adhérent voudra légitimement se retirer d'une liste devenue sans objet.
 *
 * Volontairement tolérant sur l'absence : se désinscrire deux fois, ou sans avoir été
 * inscrit, n'est pas une erreur. L'appelant demande un état — « je ne viens pas » — et
 * cet état est atteint dans les deux cas.
 */
export async function unregisterFromOpenPlay(
  db: Db,
  input: UnregisterFromOpenPlayInput
): Promise<UnregisterFromOpenPlayOutput> {
  const repo = new UnregisterFromOpenPlayRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new OpenPlaySessionNotFoundError();

  return { removed: await repo.remove(db, session.id, input.memberId) };
}
