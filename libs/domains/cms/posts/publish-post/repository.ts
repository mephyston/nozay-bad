import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPostsTable, type CmsPostRow } from '../../shared/schema';

export class PublishPostRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPostRow | undefined> {
    return db.select().from(cmsPostsTable).where(eq(cmsPostsTable.id, id)).get();
  }
  async setStatus(
    db: DbOrTx, id: number,
    values: { status: 'draft' | 'published'; publishedAt: Date | null; updatedAt: Date }
  ): Promise<CmsPostRow> {
    const [row] = await db.update(cmsPostsTable).set(values).where(eq(cmsPostsTable.id, id)).returning();
    return row;
  }
}
