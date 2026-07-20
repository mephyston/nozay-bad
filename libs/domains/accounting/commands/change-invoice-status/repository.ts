import { eq } from 'drizzle-orm';
import { invoicesTable } from '../../data-access/src/schema';

export class ChangeInvoiceStatusRepository {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async updateStatus(db: any, id: number, status: string): Promise<void> {
    await db.update(invoicesTable).set({ status: status as any }).where(eq(invoicesTable.id, id)).run();
  }
}
