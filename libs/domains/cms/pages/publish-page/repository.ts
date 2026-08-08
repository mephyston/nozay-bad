import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsPagesTable, type CmsPageRow } from '../../shared/schema';

export class PublishPageRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.id, id)).get();
  }

  async setStatus(
    db: DbOrTx,
    id: number,
    values: { status: 'draft' | 'published'; publishedAt: Date | null; updatedAt: Date }
  ): Promise<CmsPageRow> {
    const [row] = await db.update(cmsPagesTable).set(values).where(eq(cmsPagesTable.id, id)).returning();
    return row;
  }
}
