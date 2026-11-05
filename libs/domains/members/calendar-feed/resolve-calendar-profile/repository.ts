import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { calendarFeedsTable, membershipsTable, personsTable } from '../../shared/schema';

const PERSON = { id: personsTable.id, licence: personsTable.licence, firstName: personsTable.firstName };

export class ResolveCalendarProfileRepository {
  async personByTokenHash(db: DbOrTx, tokenHash: string) {
    return db
      .select(PERSON)
      .from(calendarFeedsTable)
      .innerJoin(personsTable, eq(personsTable.id, calendarFeedsTable.personId))
      .where(eq(calendarFeedsTable.tokenHash, tokenHash))
      .get();
  }

  async personByLicence(db: DbOrTx, licence: string) {
    return db.select(PERSON).from(personsTable).where(eq(personsTable.licence, licence)).get();
  }

  async membership(db: DbOrTx, personId: number, seasonId: number) {
    return db
      .select({ id: membershipsTable.id, status: membershipsTable.status })
      .from(membershipsTable)
      .where(and(eq(membershipsTable.personId, personId), eq(membershipsTable.seasonId, seasonId)))
      .get();
  }
}
