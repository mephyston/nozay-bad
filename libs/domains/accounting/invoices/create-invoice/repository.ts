import { type DbOrTx } from '@nba/db';
import { desc, like, sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { invoicesTable, invoiceItemsTable, seasonsTable } from '../../shared/schema';

export class CreateInvoiceRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }
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

  buildCreateStatements(db: DbOrTx, values: any, items: any[]): any[] {
    const insertInvoiceStmt = db.insert(invoicesTable).values(values);
    const statements: any[] = [insertInvoiceStmt];

    if (items && items.length > 0) {
      for (const item of items) {
        const itemStmt = db.insert(invoiceItemsTable).values({
          invoiceId: sql`(SELECT last_insert_rowid())`,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPrice ?? item.unitPriceCents ?? 0,
          totalPriceCents: item.totalPriceCents ?? (item.quantity * (item.unitPrice ?? item.unitPriceCents ?? 0)),
          createdAt: new Date()
        });
        statements.push(itemStmt);
      }
    }
    return statements;
  }

  async create(db: DbOrTx, values: any, items: any[]): Promise<any> {
    const newInvoice = await db.insert(invoicesTable).values(values).returning().get();
    if (items && items.length > 0) {
      const itemsArray = items.map((item) => ({
        invoiceId: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPriceCents: item.unitPrice ?? item.unitPriceCents ?? 0,
        totalPriceCents: item.totalPriceCents ?? (item.quantity * (item.unitPrice ?? item.unitPriceCents ?? 0)),
        createdAt: new Date()
      }));
      await db.insert(invoiceItemsTable).values(itemsArray).run();
    }
    return newInvoice;
  }
}
