import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { ledgerEntriesTable, seasonsTable } from '../../shared/schema';

export class CreateLedgerEntryRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  buildCreateStatement(db: DbOrTx, values: any): any {
    return db.insert(ledgerEntriesTable).values(values);
  }

  async create(db: DbOrTx, values: any): Promise<any> {
    return db.insert(ledgerEntriesTable).values(values).returning().get();
  }
}
