import { type Db } from '@metacult/shared-db';
import { ListCategoriesRepository } from './repository';
import { ListCategoriesInput, ListCategoriesOutput } from "./dto";
import { Category } from '../../shared/category';

export async function listCategories(db: Db): Promise<ListCategoriesOutput> {
  const repo = new ListCategoriesRepository();
  const categoriesData = await repo.listCategories(db);
  return categoriesData.map((c: any) => new Category(c)) as any;
}
