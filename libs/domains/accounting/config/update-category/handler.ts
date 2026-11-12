import { AppError, type Db } from '@nba/db';
import { UpdateCategoryRepository } from './repository';
import { UpdateCategoryId, UpdateCategoryInput, UpdateCategoryOutput } from "./dto";

export async function updateCategory(db: Db, id: UpdateCategoryId, body: UpdateCategoryInput): Promise<UpdateCategoryOutput> {
  const repo = new UpdateCategoryRepository();
  // Un pôle se range dans un pôle, une rubrique dans une rubrique : l'identifiant seul ne le dit pas.
  if (body.poleId != null && (await repo.groupKind(db, body.poleId)) !== 'pole') {
    throw new AppError('Pôle inconnu.', 400);
  }
  if (body.rubriqueId != null && (await repo.groupKind(db, body.rubriqueId)) !== 'rubrique') {
    throw new AppError('Rubrique inconnue.', 400);
  }
  return repo.updateCategory(db, id, body as any);
}
