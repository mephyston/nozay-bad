import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable } from '../../shared/schema';

export class UpdateInvoiceRepository {
  async getById(db: DbOrTx, id: number): Promise<any | undefined> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  }

  buildUpdateStatements(db: DbOrTx, id: number, values: any, items: any[]): any[] {
    const updateInvoiceStmt = db.update(invoicesTable).set(values).where(eq(invoicesTable.id, id));
    const deleteItemsStmt = db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
    const statements: any[] = [updateInvoiceStmt, deleteItemsStmt];

    if (items && items.length > 0) {
      for (const item of items) {
        const itemStmt = db.insert(invoiceItemsTable).values({
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPrice ?? item.unitPriceCents ?? 0,
          totalPriceCents: item.totalPriceCents ?? (item.quantity * (item.unitPrice ?? item.unitPriceCents ?? 0)),
          categoryId: item.categoryId ?? null,
          createdAt: new Date()
        });
        statements.push(itemStmt);
      }
    }
    return statements;
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
          unitPriceCents: item.unitPrice ?? item.unitPriceCents ?? 0,
          totalPriceCents: item.totalPriceCents ?? (item.quantity * (item.unitPrice ?? item.unitPriceCents ?? 0)),
          categoryId: item.categoryId ?? null,
          createdAt: new Date()
        }).run();
      }
    }
  }
}
