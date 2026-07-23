import { type Db } from '@metacult/shared-db';
import { DeleteCategoryRepository } from './repository';
import { DeleteCategoryInput, DeleteCategoryOutput } from "./dto";

export async function deleteCategory(db: Db, id: DeleteCategoryInput): Promise<DeleteCategoryOutput> {
  const repo = new DeleteCategoryRepository();
  return repo.deleteCategory(db, id);
}
