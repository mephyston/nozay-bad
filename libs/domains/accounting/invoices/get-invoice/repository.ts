import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../../shared/schema';

export class GetInvoiceRepository {
  async getById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async getItemsByInvoiceId(db: DbOrTx, invoiceId: number): Promise<any[]> {
    return db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId)).all();
  }
}
