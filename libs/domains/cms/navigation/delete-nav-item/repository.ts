import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsNavItemsTable, type CmsNavItemRow } from '../../shared/schema';

export class DeleteNavItemRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsNavItemRow | undefined> {
    return db.select().from(cmsNavItemsTable).where(eq(cmsNavItemsTable.id, id)).get();
  }

  /**
   * Supprime l'entrée **et** son sous-menu.
   *
   * La clé étrangère porte `onDelete: 'cascade'`, mais D1 n'applique pas toujours les
   * contraintes : la suppression des enfants est donc explicite, dans le même lot.
   */
  buildDeleteStatements(db: DbOrTx, id: number) {
    return [
      db.delete(cmsNavItemsTable).where(eq(cmsNavItemsTable.parentId, id)),
      db.delete(cmsNavItemsTable).where(eq(cmsNavItemsTable.id, id))
    ];
  }
}
