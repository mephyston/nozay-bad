import { eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { calendarFeedsTable, personsTable } from '../../shared/schema';

export class DeleteCalendarFeedRepository {
  async delete(db: DbOrTx, licence: string): Promise<void> {
    await db
      .delete(calendarFeedsTable)
      .where(
        inArray(
          calendarFeedsTable.personId,
          db.select({ id: personsTable.id }).from(personsTable).where(eq(personsTable.licence, licence))
        )
      )
      .run();
  }
}
