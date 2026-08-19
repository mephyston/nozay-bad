import { type Db, AppError } from '@nba/db';
import { DeleteCategoryRepository } from './repository';
import { DeleteCategoryInput, DeleteCategoryOutput } from "./dto";

export async function deleteCategory(db: Db, id: DeleteCategoryInput): Promise<DeleteCategoryOutput> {
  const repo = new DeleteCategoryRepository();
  const isUsed = await repo.isCategoryUsed(db, id);
  if (isUsed) {
    throw new AppError('Impossible de supprimer cette catégorie car elle est utilisée dans des écritures comptables.', 403);
  }
  return repo.deleteCategory(db, id);
}
