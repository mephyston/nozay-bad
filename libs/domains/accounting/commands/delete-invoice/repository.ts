import { type DbOrTx } from '@metacult/shared-db';
import { eq } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../../shared/schema';

export class DeleteInvoiceRepository {
  async getById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async delete(db: DbOrTx, id: number): Promise<void> {
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id)).run();
    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).run();
  }
}
