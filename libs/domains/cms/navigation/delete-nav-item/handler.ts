import { type Db } from '@nba/db';
import { CmsNavItemNotFoundError } from '../../shared/errors';
import { DeleteNavItemRepository } from './repository';
import type { DeleteNavItemInput, DeleteNavItemOutput } from './dto';

export async function deleteNavItem(db: Db, input: DeleteNavItemInput): Promise<DeleteNavItemOutput> {
  const repo = new DeleteNavItemRepository();
  const existing = await repo.findById(db, input.navItemId);
  if (!existing) throw new CmsNavItemNotFoundError();

  await db.batch(repo.buildDeleteStatements(db, existing.id) as never);
  return { deleted: true };
}
