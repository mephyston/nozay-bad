import { type DbOrTx } from '@metacult/shared-db';
import { like } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../../shared/schema';

export class CreateInvoiceRepository {
  async generateInvoiceNumber(db: DbOrTx, seasonId: string): Promise<string> {
    const seasonShort = seasonId.replace('-', '');
    const prefix = `FAC-${seasonShort}-NBA91-`;
    const lastInvoices = await db.select()
      .from(invoicesTable)
      .where(like(invoicesTable.invoiceNumber, `${prefix}%`))
      .all();
    let nextNum = 1;
    if (lastInvoices.length > 0) {
      const nums = lastInvoices.map((inv) => {
        const parts = inv.invoiceNumber.split('-');
        return parseInt(parts[parts.length - 1]) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async create(db: DbOrTx, values: any, items: any[]): Promise<any> {
    const newInvoice = await db.insert(invoicesTable).values(values).returning().get();
    if (items && items.length > 0) {
      for (const item of items) {
        await db.insert(invoiceItemsTable).values({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          createdAt: new Date()
        }).run();
      }
    }
    return newInvoice;
  }
}
