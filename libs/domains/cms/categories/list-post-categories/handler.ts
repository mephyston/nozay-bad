import { type Db } from '@nba/db';
import { ListPostCategoriesRepository } from './repository';
import type { ListPostCategoriesOutput } from './dto';

export async function listPostCategories(db: Db): Promise<ListPostCategoriesOutput> {
  return new ListPostCategoriesRepository().list(db);
}
