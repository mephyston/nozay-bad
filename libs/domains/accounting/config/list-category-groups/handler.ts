import { type Db } from '@nba/db';
import { ListCategoryGroupsRepository } from './repository';
import type { CategoryGroupOutput } from './dto';

/** Pôles puis rubriques, chacun dans l'ordre choisi par le bureau. */
export async function listCategoryGroups(db: Db): Promise<CategoryGroupOutput[]> {
  return new ListCategoryGroupsRepository().listCategoryGroups(db);
}
