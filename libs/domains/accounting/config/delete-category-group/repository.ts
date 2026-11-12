import { type Db } from '@nba/db';
import { eq } from 'drizzle-orm';
import { categoriesTable, categoryGroupsTable } from '../../shared/schema';

export class DeleteCategoryGroupRepository {
  async exists(db: Db, id: number): Promise<boolean> {
    return !!(await db.select({ id: categoryGroupsTable.id }).from(categoryGroupsTable).where(eq(categoryGroupsTable.id, id)).get());
  }

  /**
   * Les catégories rangées là perdent leur pôle ou leur rubrique, dans le même lot que la
   * suppression. La clé étrangère le ferait seule, mais une base où elles ne sont pas
   * appliquées garderait sinon des renvois vers un regroupement disparu.
   */
  async delete(db: Db, id: number): Promise<void> {
    await db.batch([
      db.update(categoriesTable).set({ poleId: null }).where(eq(categoriesTable.poleId, id)),
      db.update(categoriesTable).set({ rubriqueId: null }).where(eq(categoriesTable.rubriqueId, id)),
      db.delete(categoryGroupsTable).where(eq(categoryGroupsTable.id, id))
    ]);
  }
}
