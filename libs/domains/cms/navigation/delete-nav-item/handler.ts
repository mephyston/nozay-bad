import { type Db } from '@nba/db';
import { CmsNavItemNotFoundError } from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { DeleteNavItemRepository } from './repository';
import type { DeleteNavItemInput, DeleteNavItemOutput } from './dto';

export async function deleteNavItem(db: Db, input: DeleteNavItemInput): Promise<DeleteNavItemOutput> {
  const repo = new DeleteNavItemRepository();
  const existing = await repo.findById(db, input.navItemId);
  if (!existing) throw new CmsNavItemNotFoundError();

  await db.batch(repo.buildDeleteStatements(db, existing.id) as never);

  // Les menus sont rendus sur **toutes** les pages : sans invalidation, une entrée
  // ajoutée ou renommée resterait invisible jusqu'à expiration du cache du bord — une
  // heure — et l'on croirait l'enregistrement perdu.
  await bumpContentVersion(db);
  return { deleted: true };
}
