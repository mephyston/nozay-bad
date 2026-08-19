import { type Db } from '@nba/db';
import { CmsRedirectNotFoundError } from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { DeleteRedirectRepository } from './repository';

/**
 * Supprime une redirection : l'ancienne adresse répondra 404.
 *
 * Aucun invariant à revérifier — retirer une ligne ne peut créer ni boucle ni chaîne.
 * Le geste est pensé pour la purge des redirections jamais empruntées, que le
 * compteur d'usage désigne.
 */
export async function deleteRedirect(db: Db, redirectId: number, now: Date = new Date()): Promise<void> {
  const repo = new DeleteRedirectRepository();

  const redirect = await repo.findById(db, redirectId);
  if (!redirect) throw new CmsRedirectNotFoundError();

  await repo.delete(db, redirectId);

  // Sans quoi le site public continuerait de servir la redirection depuis son cache.
  await bumpContentVersion(db, now);
}
