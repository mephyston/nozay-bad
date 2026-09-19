import { type Db } from '@nba/db';
import { SearchPostsRepository, type SearchablePost } from './repository';

/** Au-delà, ce sont des archives : la recherche ne prétend pas y remonter. */
const SCANNED = 400;

/**
 * Les articles publiés, prêts à être filtrés par une recherche.
 *
 * La comparaison — sans accents, mot par mot — appartient à qui compose la recherche
 * de tout le site ; ici on ne rend que la matière, dans l'ordre de publication.
 */
export async function listSearchablePosts(db: Db, limit = SCANNED): Promise<SearchablePost[]> {
  return new SearchPostsRepository().listPublished(db, limit);
}

export type { SearchablePost };
