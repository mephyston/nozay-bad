import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPostsTable, type CmsPostRow } from '../../shared/schema';

export class DeletePostRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPostRow | undefined> {
    return db.select().from(cmsPostsTable).where(eq(cmsPostsTable.id, id)).get();
  }
  async remove(db: DbOrTx, id: number): Promise<void> {
    // Les liaisons de catégorie partent en cascade.
    await db.delete(cmsPostsTable).where(eq(cmsPostsTable.id, id)).run();
  }
}
