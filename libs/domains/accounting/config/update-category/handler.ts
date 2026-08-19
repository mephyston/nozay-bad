import { type Db } from '@nba/db';
import { UpdateCategoryRepository } from './repository';
import { UpdateCategoryId, UpdateCategoryInput, UpdateCategoryOutput } from "./dto";

export async function updateCategory(db: Db, id: UpdateCategoryId, body: UpdateCategoryInput): Promise<UpdateCategoryOutput> {
  const repo = new UpdateCategoryRepository();
  return repo.updateCategory(db, id, body as any);
}
