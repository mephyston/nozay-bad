import { categoriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { accountClassesTable } from '../../shared/schema';

export class ListCategoriesRepository {
  async listCategories(db: DbOrTx): Promise<any[]> {
    const rc = alias(accountClassesTable, 'rc');
    const ec = alias(accountClassesTable, 'ec');

    const rows = await db
      .select({
        id: categoriesTable.id,
        adminLabel: categoriesTable.adminLabel,
        adherentLabel: categoriesTable.adherentLabel,
        hideInExpenses: categoriesTable.hideInExpenses,
        receiptAccountClassId: categoriesTable.receiptAccountClassId,
        expenseAccountClassId: categoriesTable.expenseAccountClassId,
        receiptCode: rc.code,
        receiptLabel: rc.label,
        expenseCode: ec.code,
        expenseLabel: ec.label,
        active: categoriesTable.active,
        createdAt: categoriesTable.createdAt
      })
      .from(categoriesTable)
      .leftJoin(rc, eq(categoriesTable.receiptAccountClassId, rc.id))
      .leftJoin(ec, eq(categoriesTable.expenseAccountClassId, ec.id))
      .all();

    rows.sort((a, b) => (a.adminLabel || '').localeCompare(b.adminLabel || '', 'fr', { sensitivity: 'base' }));

    return rows;
  }
}
