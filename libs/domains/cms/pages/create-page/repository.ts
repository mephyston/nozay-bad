import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPagesTable, type CmsPageRow } from '../../shared/schema';

export class CreatePageRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
  }

  async findHome(db: DbOrTx): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.template, 'home')).get();
  }

  async findByPath(db: DbOrTx, path: string): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.path, path)).get();
  }

  async insert(db: DbOrTx, values: typeof cmsPagesTable.$inferInsert): Promise<CmsPageRow> {
    const [row] = await db.insert(cmsPagesTable).values(values).returning();
    return row;
  }
}
