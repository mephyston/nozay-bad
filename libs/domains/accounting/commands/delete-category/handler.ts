import { DeleteCategoryRepository } from './repository';

export async function deleteCategory(db: any, id: number) {
  const repo = new DeleteCategoryRepository();
  return repo.deleteCategory(db, id);
}
