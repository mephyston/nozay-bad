import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { openPlayOpenersTable } from '../../shared/open-play-schema';

export class DeleteOpenPlayOpenerRepository {
  async remove(db: DbOrTx, id: number): Promise<boolean> {
    const removed = await db
      .delete(openPlayOpenersTable)
      .where(eq(openPlayOpenersTable.id, id))
      .returning();
    return removed.length > 0;
  }
}
