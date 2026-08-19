import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsRedirectsTable, type CmsRedirectRow } from '../../shared/schema';

export class UpdateRedirectRepository {
  async findById(db: DbOrTx, id: number): Promise<CmsRedirectRow | undefined> {
    return db.select().from(cmsRedirectsTable).where(eq(cmsRedirectsTable.id, id)).get();
  }

  async findByFromPath(db: DbOrTx, fromPath: string): Promise<CmsRedirectRow | undefined> {
    return db.select().from(cmsRedirectsTable).where(eq(cmsRedirectsTable.fromPath, fromPath)).get();
  }

  async update(
    db: DbOrTx,
    id: number,
    values: { toPath: string | null; statusCode: number; note?: string | null }
  ): Promise<void> {
    await db.update(cmsRedirectsTable).set(values).where(eq(cmsRedirectsTable.id, id)).run();
  }
}
