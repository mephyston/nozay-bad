import { AppError, type Db } from '@nba/db';
import { ManageItemsRepository } from './repository';
import type { SaveItemInput } from './dto';

const repo = new ManageItemsRepository();

export const listItems = (db: Db) => repo.list(db);

export const createItem = (db: Db, input: SaveItemInput) => repo.create(db, input);

export async function updateItem(db: Db, id: number, input: SaveItemInput) {
  const item = await repo.update(db, id, input);
  if (!item) throw new AppError('Article introuvable.', 404);
  return item;
}
