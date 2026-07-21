import { eq } from 'drizzle-orm';
import { invoicesTable } from '../../shared/schema';
import { isSeasonClosed as drizzleIsSeasonClosed } from '@metacult/features-members-api';

export interface ChangeInvoiceStatusRepositoryInterface {
  getById(db: any, id: number): Promise<any | undefined>;
  updateStatus(db: any, id: number, status: string): Promise<void>;
  isSeasonClosed(db: any, seasonId: string): Promise<boolean>;
}

export class ChangeInvoiceStatusRepository implements ChangeInvoiceStatusRepositoryInterface {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async updateStatus(db: any, id: number, status: string): Promise<void> {
    await db.update(invoicesTable).set({ status: status as any }).where(eq(invoicesTable.id, id)).run();
  }

  async isSeasonClosed(db: any, seasonId: string): Promise<boolean> {
    return drizzleIsSeasonClosed(db, seasonId);
  }
}
