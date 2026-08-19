import { seasonsTable } from '@nba/accounting/schema';
import { ledgerEntriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq, sql } from 'drizzle-orm';
import { checksTable } from '../../shared/schema';
import { getAllMembers } from '@nba/members-api';

export class RecordCheckTransactionRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async getAllMembers(db: DbOrTx): Promise<any[]> {
    return getAllMembers(db);
  }

  buildCreateLedgerEntryStatement(db: DbOrTx, values: any): any {
    return db.insert(ledgerEntriesTable).values({
      seasonId: typeof values.seasonId === 'number' ? values.seasonId : Number(values.seasonId),
      type: values.type,
      accountId: typeof values.accountId === 'number' ? values.accountId : (Number(values.accountId) || 1),
      categoryId: values.categoryId ?? values.category ?? null,
      amountCents: values.amountCents ?? (values.amount !== undefined ? Math.round(values.amount) : 0),
      date: values.date,
      paymentMethodId: typeof values.paymentMethodId === 'number' ? values.paymentMethodId : 2,
      description: values.description,
      reference: values.reference || null,
      memberId: values.memberId || null,
      createdAt: values.createdAt || new Date()
    });
  }

  buildCreateCheckStatement(db: DbOrTx, values: any): any {
    return db.insert(checksTable).values({
      seasonId: typeof values.seasonId === 'number' ? values.seasonId : Number(values.seasonId),
      number: values.number,
      amountCents: values.amountCents ?? (values.amount !== undefined ? Math.round(values.amount) : 0),
      emitter: values.emitter,
      bank: values.bank || null,
      memberId: values.memberId || null,
      status: values.status || 'received',
      photoUrl: values.photoUrl || null,
      ledgerEntryId: sql`(SELECT last_insert_rowid())`,
      createdAt: values.createdAt || new Date()
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
