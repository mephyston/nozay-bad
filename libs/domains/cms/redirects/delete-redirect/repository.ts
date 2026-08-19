import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsRedirectsTable, type CmsRedirectRow } from '../../shared/schema';

export class DeleteRedirectRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsRedirectRow | undefined> {
    return db.select().from(cmsRedirectsTable).where(eq(cmsRedirectsTable.id, id)).get();
  }

  async delete(db: DbOrTx, id: number): Promise<void> {
    await db.delete(cmsRedirectsTable).where(eq(cmsRedirectsTable.id, id)).run();
  }
}
