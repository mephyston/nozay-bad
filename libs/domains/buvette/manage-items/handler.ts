import { AppError, type Db } from '@nba/db';
import { isItemIconKey } from '../shared/item-icons';
import { ManageItemsRepository } from './repository';
import type { SaveItemInput } from './dto';

const repo = new ManageItemsRepository();

export const listItems = (db: Db) => repo.list(db);

function checkIcon(input: SaveItemInput): void {
  if (input.icon && !isItemIconKey(input.icon)) throw new AppError('Pictogramme inconnu.', 400);
}

export function createItem(db: Db, input: SaveItemInput) {
  checkIcon(input);
  return repo.create(db, input);
}

export async function updateItem(db: Db, id: number, input: SaveItemInput) {
  checkIcon(input);
  const item = await repo.update(db, id, input);
  if (!item) throw new AppError('Article introuvable.', 404);
  return item;
}
