import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  cmsPagesTable,
  cmsRedirectsTable,
  type CmsPageRow,
  type CmsRedirectRow
} from '../../shared/schema';

export class CreateRedirectRepository {
  async findByFromPath(db: DbOrTx, fromPath: string): Promise<CmsRedirectRow | undefined> {
    return db.select().from(cmsRedirectsTable).where(eq(cmsRedirectsTable.fromPath, fromPath)).get();
  }

  async findPageByPath(db: DbOrTx, path: string): Promise<CmsPageRow | undefined> {
    return db.select().from(cmsPagesTable).where(eq(cmsPagesTable.path, path)).get();
  }

  async insert(
    db: DbOrTx,
    values: {
      fromPath: string;
      toPath: string | null;
      statusCode: number;
      note: string | null;
      createdAt: Date;
    }
  ): Promise<CmsRedirectRow> {
    const rows = await db.insert(cmsRedirectsTable).values(values).returning();
    return rows[0];
  }
}
