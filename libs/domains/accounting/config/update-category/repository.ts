import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { categoriesTable, accountClassesTable } from '../../shared/schema';

export class UpdateCategoryRepository {
  async updateCategory(db: DbOrTx, id: number, values: {
    adminLabel?: string;
    adherentLabel?: string;
    hideInExpenses?: boolean;
    receiptAccountClassId?: number | null;
    expenseAccountClassId?: number | null;
    receiptCode?: string | null;
    expenseCode?: string | null;
  }): Promise<any> {
    const updateData: any = {};
    if (values.adminLabel !== undefined) updateData.adminLabel = values.adminLabel;
    if (values.adherentLabel !== undefined) updateData.adherentLabel = values.adherentLabel;
    if (values.hideInExpenses !== undefined) updateData.hideInExpenses = values.hideInExpenses;

    if (values.receiptAccountClassId !== undefined) {
      updateData.receiptAccountClassId = values.receiptAccountClassId;
    } else if (values.receiptCode !== undefined) {
      if (!values.receiptCode) {
        updateData.receiptAccountClassId = null;
      } else {
        const cls = await db.select().from(accountClassesTable).where(eq(accountClassesTable.code, values.receiptCode)).get();
        updateData.receiptAccountClassId = cls ? cls.id : null;
      }
    }

    if (values.expenseAccountClassId !== undefined) {
      updateData.expenseAccountClassId = values.expenseAccountClassId;
    } else if (values.expenseCode !== undefined) {
      if (!values.expenseCode) {
        updateData.expenseAccountClassId = null;
      } else {
        const cls = await db.select().from(accountClassesTable).where(eq(accountClassesTable.code, values.expenseCode)).get();
        updateData.expenseAccountClassId = cls ? cls.id : null;
      }
    }

    return db.update(categoriesTable).set(updateData).where(eq(categoriesTable.id, id)).returning().get();
  }
}
