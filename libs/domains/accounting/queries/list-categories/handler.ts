import { ListCategoriesRepository } from './repository';
import { ListCategoriesInput, ListCategoriesOutput } from "./dto";

export async function listCategories(db: any): Promise<ListCategoriesOutput> {
  const repo = new ListCategoriesRepository();
  return repo.listCategories(db);
}
