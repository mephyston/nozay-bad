import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { ledgerEntriesTable, checksTable } from '../../shared/schema';
import { getAllMembers } from '@nba/members-api';

export class RecordCheckTransactionRepository {
  async getAllMembers(db: DbOrTx): Promise<any[]> {
    return getAllMembers(db);
  }

  async createTransaction(db: DbOrTx, values: any): Promise<any> {
    return db.insert(ledgerEntriesTable).values(values).returning().get();
  }

  async createCheck(db: DbOrTx, values: any): Promise<any> {
    return db.insert(checksTable).values(values).returning().get();
  }

  async getCheckById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(checksTable).where(eq(checksTable.id, id)).get();
  }

  async getTransactionById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
  }

  async unlinkCheckTransaction(db: DbOrTx, id: number): Promise<void> {
    await db.update(checksTable).set({ ledgerEntryId: null }).where(eq(checksTable.id, id)).run();
  }

  async deleteTransaction(db: DbOrTx, id: number): Promise<void> {
    await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).run();
  }

  async deleteCheck(db: DbOrTx, id: number): Promise<void> {
    await db.delete(checksTable).where(eq(checksTable.id, id)).run();
  }
}
