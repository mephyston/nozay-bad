import { eq, like, ne, and } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPagesTable, type CmsPageRow } from '../../shared/schema';

export class UpdatePageRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
  }

  async findByPath(db: DbOrTx, path: string): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.path, path)).get();
  }

  /**
   * Toute la descendance d'une page, à n'importe quelle profondeur.
   *
   * Le préfixe de chemin suffit : `path` est dénormalisé et se termine par une barre
   * oblique, donc `/le-club/` ne peut pas capter `/le-club-house/`.
   */
  async findDescendants(db: DbOrTx, path: string): Promise<CmsPageRow[]> {
    return db
      .select()
      .from(cmsPagesTable)
      .where(and(like(cmsPagesTable.path, `${path}%`), ne(cmsPagesTable.path, path)))
      .all();
  }

  buildUpdate(db: DbOrTx, id: number, values: Partial<typeof cmsPagesTable.$inferInsert>) {
    return db.update(cmsPagesTable).set(values).where(eq(cmsPagesTable.id, id));
  }
}
