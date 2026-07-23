import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../../shared/schema';

export class UpdateInvoiceRepository {
  async getById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async update(db: DbOrTx, id: number, values: any, items: any[]): Promise<void> {
    await db.update(invoicesTable).set(values).where(eq(invoicesTable.id, id)).run();
    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).run();
    if (items && items.length > 0) {
      for (const item of items) {
        await db.insert(invoiceItemsTable).values({
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          createdAt: new Date()
        }).run();
      }
    }
  }
}
