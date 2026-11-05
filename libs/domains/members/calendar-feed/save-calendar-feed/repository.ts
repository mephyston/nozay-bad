import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { calendarFeedsTable, personsTable } from '../../shared/schema';

export class SaveCalendarFeedRepository {
  async personIdOf(db: DbOrTx, licence: string): Promise<number | undefined> {
    const row = await db.select({ id: personsTable.id }).from(personsTable).where(eq(personsTable.licence, licence)).get();
    return row?.id;
  }

  /** Une ligne par personne : écrire remplace, donc révoque l'adresse précédente. */
  async upsert(db: DbOrTx, personId: number, tokenHash: string, createdAt: Date): Promise<void> {
    await db
      .insert(calendarFeedsTable)
      .values({ personId, tokenHash, createdAt })
      .onConflictDoUpdate({ target: calendarFeedsTable.personId, set: { tokenHash, createdAt } })
      .run();
  }
}
