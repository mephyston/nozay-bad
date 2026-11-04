import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { calendarFeedsTable, personsTable } from '../../shared/schema';

export class GetCalendarFeedRepository {
  async createdAt(db: DbOrTx, licence: string): Promise<Date | undefined> {
    const row = await db
      .select({ createdAt: calendarFeedsTable.createdAt })
      .from(calendarFeedsTable)
      .innerJoin(personsTable, eq(personsTable.id, calendarFeedsTable.personId))
      .where(eq(personsTable.licence, licence))
      .get();
    return row?.createdAt;
  }
}
