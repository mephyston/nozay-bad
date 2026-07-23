import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { invoicesTable } from '../../shared/schema';
import { isSeasonClosed as drizzleIsSeasonClosed } from '@nba/members-api';

export interface ChangeInvoiceStatusRepositoryInterface {
  getById(db: DbOrTx, id: number): Promise<any | undefined>;
  updateStatus(db: DbOrTx, id: number, status: string): Promise<void>;
  isSeasonClosed(db: DbOrTx, seasonId: string): Promise<boolean>;
}

export class ChangeInvoiceStatusRepository implements ChangeInvoiceStatusRepositoryInterface {
  async getById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async updateStatus(db: DbOrTx, id: number, status: string): Promise<void> {
    await db.update(invoicesTable).set({ status: status as any }).where(eq(invoicesTable.id, id)).run();
  }

  async isSeasonClosed(db: DbOrTx, seasonId: string): Promise<boolean> {
    return drizzleIsSeasonClosed(db, seasonId);
  }
}
