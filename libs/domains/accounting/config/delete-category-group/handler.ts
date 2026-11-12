import { AppError, type Db } from '@nba/db';
import { DeleteCategoryGroupRepository } from './repository';

/** Supprime un pôle ou une rubrique ; ses catégories redeviennent « sans regroupement ». */
export async function deleteCategoryGroup(db: Db, id: number): Promise<void> {
  const repo = new DeleteCategoryGroupRepository();
  if (!(await repo.exists(db, id))) throw new AppError('Regroupement introuvable.', 404);
  await repo.delete(db, id);
}
