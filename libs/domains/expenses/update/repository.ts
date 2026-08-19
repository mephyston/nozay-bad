import { getSeasonId } from '@nba/accounting-api';
import { eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expensesTable } from '../shared/schema';

export class UpdateExpenseRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    const sId = await getSeasonId(db, seasonIdOrCode);
    return sId !== undefined ? sId : 1;
  }

  async getById(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect | undefined> {
    return db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
  }

  async update(db: DbOrTx, id: number, values: Partial<typeof expensesTable.$inferInsert>): Promise<typeof expensesTable.$inferSelect | undefined> {
    return db.update(expensesTable).set(values).where(eq(expensesTable.id, id)).returning().get();
  }

  buildApproveExpenseStatement(db: DbOrTx, id: number): any {
    return db.update(expensesTable)
      .set({
        status: 'approved',
        ledgerEntryId: sql`(SELECT last_insert_rowid())`
      })
      .where(eq(expensesTable.id, id));
  }

  buildCancelApprovalExpenseStatement(db: DbOrTx, id: number): any {
    return db.update(expensesTable)
      .set({ status: 'pending', ledgerEntryId: null })
      .where(eq(expensesTable.id, id));
  }

  async approve(db: DbOrTx, id: number, ledgerEntryId: number): Promise<typeof expensesTable.$inferSelect> {
    return db.update(expensesTable)
      .set({ status: 'approved', ledgerEntryId })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async reject(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect> {
    return db.update(expensesTable)
      .set({ status: 'rejected' })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }

  async cancelApproval(db: DbOrTx, id: number): Promise<typeof expensesTable.$inferSelect> {
    return db.update(expensesTable)
      .set({ status: 'pending', ledgerEntryId: null })
      .where(eq(expensesTable.id, id))
      .returning().get();
  }
}
