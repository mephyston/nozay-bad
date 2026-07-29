import { ledgerEntriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';


export class UpdateLedgerEntryRepository {
  async getById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
  }

  async update(db: DbOrTx, id: number, values: any): Promise<any | undefined> {
    return db.update(ledgerEntriesTable).set(values).where(eq(ledgerEntriesTable.id, id)).returning().get();
  }
}
