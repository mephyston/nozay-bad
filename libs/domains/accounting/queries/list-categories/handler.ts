import { ListCategoriesRepository } from './repository';
import { ListCategoriesInput, ListCategoriesOutput } from "./dto";
import { Category } from '../../shared/category';

export async function listCategories(db: any): Promise<ListCategoriesOutput> {
  const repo = new ListCategoriesRepository();
  const categoriesData = await repo.listCategories(db);
  return categoriesData.map((c: any) => new Category(c)) as any;
}
