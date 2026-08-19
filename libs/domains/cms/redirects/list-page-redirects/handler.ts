import { type Db } from '@nba/db';
import { normalisePath } from '../../shared/slug';
import { ListPageRedirectsRepository } from './repository';
import type { ListPageRedirectsInput, ListPageRedirectsOutput } from './dto';

/**
 * Anciennes adresses qui mènent à une page.
 *
 * Sert l'encart de l'écran d'édition : renommer une page y ajoute une ligne, et le
 * compteur d'usage dit si l'ancienne adresse sert encore — donc s'il serait prudent
 * de la garder.
 */
export async function listPageRedirects(
  db: Db,
  input: ListPageRedirectsInput
): Promise<ListPageRedirectsOutput> {
  const repo = new ListPageRedirectsRepository();
  return repo.listByTarget(db, normalisePath(input.toPath));
}
