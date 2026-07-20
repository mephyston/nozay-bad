import { ListCategoriesRepository } from './repository';

export async function listCategories(db: any) {
  const repo = new ListCategoriesRepository();
  return repo.listCategories(db);
}
