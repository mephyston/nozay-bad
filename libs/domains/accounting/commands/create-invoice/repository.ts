import { type DbOrTx } from '@metacult/shared-db';
import { desc, like } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../../shared/schema';

export class CreateInvoiceRepository {
  async generateInvoiceNumber(db: DbOrTx, seasonId: string): Promise<string> {
    const seasonShort = seasonId.replace('-', '');
    const prefix = `FAC-${seasonShort}-NBA91-`;
    const [lastInvoice] = await db
      .select({ invoiceNumber: invoicesTable.invoiceNumber })
      .from(invoicesTable)
      .where(like(invoicesTable.invoiceNumber, `${prefix}%`))
      .orderBy(desc(invoicesTable.invoiceNumber))
      .limit(1)
      .all();

    let nextNum = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const parts = lastInvoice.invoiceNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async create(db: DbOrTx, values: any, items: any[]): Promise<any> {
    const newInvoice = await db.insert(invoicesTable).values(values).returning().get();
    if (items && items.length > 0) {
      const itemsArray = items.map((item) => ({
        invoiceId: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        createdAt: new Date()
      }));
      await db.insert(invoiceItemsTable).values(itemsArray).run();
    }
    return newInvoice;
  }
}
