import { eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsNavItemsTable, type CmsNavItemRow } from '../../shared/schema';

export class ReorderNavItemsRepository {
  async findMany(db: DbOrTx, ids: number[]): Promise<CmsNavItemRow[]> {
    return db.select().from(cmsNavItemsTable).where(inArray(cmsNavItemsTable.id, ids)).all();
  }

  buildPositionStatements(db: DbOrTx, ids: number[]) {
    return ids.map((id, position) =>
      db.update(cmsNavItemsTable).set({ position }).where(eq(cmsNavItemsTable.id, id))
    );
  }
}
