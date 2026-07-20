import { eq } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../data-access/src/schema';

export class DeleteInvoiceRepository {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async delete(db: any, id: number): Promise<void> {
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id)).run();
    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).run();
  }
}
