import { type Db } from '@nba/db';
import { ListRedirectsRepository } from './repository';
import type { ListRedirectsOutput } from './dto';

/**
 * Toutes les redirections du site, pour l'écran d'administration.
 *
 * Le tri « les plus empruntées d'abord » y fait remonter celles qui travaillent
 * encore ; la queue de la liste, jamais empruntée, est la candidate à la purge.
 * Pas de pagination : la table se compte en dizaines de lignes, la recherche se
 * fait côté client.
 */
export async function listRedirects(db: Db): Promise<ListRedirectsOutput> {
  const repo = new ListRedirectsRepository();
  return repo.listAll(db);
}
