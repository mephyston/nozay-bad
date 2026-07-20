import { eq } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../../data-access/src/schema';

export class GetInvoiceRepository {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async getItemsByInvoiceId(db: any, invoiceId: number): Promise<any[]> {
    return db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId)).all();
  }
}
