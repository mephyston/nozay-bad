import { and, eq, isNull, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsNavItemsTable, cmsPagesTable, type CmsNavItemRow } from '../../shared/schema';

export class SaveNavItemRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsNavItemRow | undefined> {
    return db.select().from(cmsNavItemsTable).where(eq(cmsNavItemsTable.id, id)).get();
  }

  async pageExists(db: DbOrTx, id: number): Promise<boolean> {
    const row = await db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
    return Boolean(row);
  }

  /** Rang suivant dans la fratrie, pour qu'une nouvelle entrée se pose à la fin. */
  async nextPosition(db: DbOrTx, location: 'header' | 'footer', parentId: number | null): Promise<number> {
    const [row] = await db
      .select({ max: sql<number>`coalesce(max(${cmsNavItemsTable.position}), -1)` })
      .from(cmsNavItemsTable)
      .where(
        and(
          eq(cmsNavItemsTable.location, location),
          parentId === null ? isNull(cmsNavItemsTable.parentId) : eq(cmsNavItemsTable.parentId, parentId)
        )
      )
      .all();
    return (row?.max ?? -1) + 1;
  }

  async hasChildren(db: DbOrTx, id: number): Promise<boolean> {
    const row = await db.select().from(cmsNavItemsTable).where(eq(cmsNavItemsTable.parentId, id)).get();
    return Boolean(row);
  }

  async insert(db: DbOrTx, values: typeof cmsNavItemsTable.$inferInsert): Promise<CmsNavItemRow> {
    const [row] = await db.insert(cmsNavItemsTable).values(values).returning();
    return row;
  }

  async update(db: DbOrTx, id: number, values: Partial<typeof cmsNavItemsTable.$inferInsert>): Promise<CmsNavItemRow> {
    const [row] = await db.update(cmsNavItemsTable).set(values).where(eq(cmsNavItemsTable.id, id)).returning();
    return row;
  }
}
