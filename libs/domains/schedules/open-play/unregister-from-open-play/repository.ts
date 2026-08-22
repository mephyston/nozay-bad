import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  openPlayRegistrationsTable,
  openPlaySessionsTable,
  type OpenPlaySessionRow
} from '../../shared/open-play-schema';

export class UnregisterFromOpenPlayRepository {
  async findSession(db: DbOrTx, id: number): Promise<OpenPlaySessionRow | undefined> {
    return db.select().from(openPlaySessionsTable).where(eq(openPlaySessionsTable.id, id)).get();
  }

  /** Les invités partent avec, par la cascade déclarée en base. */
  async remove(db: DbOrTx, sessionId: number, memberId: number): Promise<boolean> {
    const removed = await db
      .delete(openPlayRegistrationsTable)
      .where(
        and(
          eq(openPlayRegistrationsTable.sessionId, sessionId),
          eq(openPlayRegistrationsTable.memberId, memberId)
        )
      )
      .returning();
    return removed.length > 0;
  }
}
