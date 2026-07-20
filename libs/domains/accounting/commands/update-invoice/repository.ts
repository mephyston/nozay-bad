import { eq } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../../data-access/src/schema';

export class UpdateInvoiceRepository {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  async update(db: any, id: number, values: any, items: any[]): Promise<void> {
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
