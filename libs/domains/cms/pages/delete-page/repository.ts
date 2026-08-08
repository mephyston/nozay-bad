import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPagesTable, type CmsPageRow } from '../../shared/schema';

export class DeletePageRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
  }

  async countChildren(db: DbOrTx, id: number): Promise<number> {
    const rows = await db.select().from(cmsPagesTable).where(eq(cmsPagesTable.parentId, id)).all();
    return rows.length;
  }

  async remove(db: DbOrTx, id: number): Promise<void> {
    // Les blocs et les révisions partent en cascade (contrainte de clé étrangère).
    await db.delete(cmsPagesTable).where(eq(cmsPagesTable.id, id)).run();
  }
}
