import { type Db } from '@nba/db';
import { ListCategoriesRepository } from './repository';
import { ListCategoriesInput, ListCategoriesOutput } from "./dto";
import { Category } from '../../shared/category';

export async function listCategories(db: Db): Promise<ListCategoriesOutput> {
  const repo = new ListCategoriesRepository();
  const categoriesData = await repo.listCategories(db);
  return categoriesData.map((c) => new Category(c)) as any;
}
