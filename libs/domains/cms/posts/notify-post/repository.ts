import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPostsTable, type CmsPostRow } from '../../shared/schema';

export class NotifyPostRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPostRow | undefined> {
    return db.select().from(cmsPostsTable).where(eq(cmsPostsTable.id, id)).get();
  }

  async markNotified(db: DbOrTx, id: number, notifiedAt: Date): Promise<void> {
    await db.update(cmsPostsTable).set({ notifiedAt }).where(eq(cmsPostsTable.id, id)).run();
  }
}
