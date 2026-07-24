import { type DbOrTx } from '@nba/db';
import { eq, sql } from 'drizzle-orm';
import { ledgerEntriesTable, checksTable } from '../../shared/schema';
import { getAllMembers } from '@nba/members-api';

export class RecordCheckTransactionRepository {
  async getAllMembers(db: DbOrTx): Promise<any[]> {
    return getAllMembers(db);
  }

  buildCreateLedgerEntryStatement(db: DbOrTx, values: any): any {
    return db.insert(ledgerEntriesTable).values(values);
  }

  buildCreateCheckStatement(db: DbOrTx, values: any): any {
    return db.insert(checksTable).values({
      ...values,
      ledgerEntryId: sql`(SELECT last_insert_rowid())`
    });
  }

  buildDeleteLedgerEntryStatement(db: DbOrTx, id: number): any {
    return db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id));
  }

  buildDeleteCheckStatement(db: DbOrTx, id: number): any {
    return db.delete(checksTable).where(eq(checksTable.id, id));
  }

  async createLedgerEntry(db: DbOrTx, values: any): Promise<any> {
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

  async deleteLedgerEntry(db: DbOrTx, id: number): Promise<void> {
    await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).run();
  }

  async deleteCheck(db: DbOrTx, id: number): Promise<void> {
    await db.delete(checksTable).where(eq(checksTable.id, id)).run();
  }
}
