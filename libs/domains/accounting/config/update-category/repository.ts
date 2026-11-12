import { categoriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { accountClassesTable, categoryGroupsTable, type CategoryGroupKind } from '../../shared/schema';

export class UpdateCategoryRepository {
  async groupKind(db: DbOrTx, id: number): Promise<CategoryGroupKind | undefined> {
    const row = await db.select({ kind: categoryGroupsTable.kind }).from(categoryGroupsTable).where(eq(categoryGroupsTable.id, id)).get();
    return row?.kind;
  }

  async updateCategory(db: DbOrTx, id: number, values: {
    adminLabel?: string;
    adherentLabel?: string;
    hideInExpenses?: boolean;
    receiptAccountClassId?: number | null;
    expenseAccountClassId?: number | null;
    receiptCode?: string | null;
    expenseCode?: string | null;
    active?: boolean;
    poleId?: number | null;
    rubriqueId?: number | null;
  }): Promise<any> {
    const updateData: any = {};
    if (values.adminLabel !== undefined) updateData.adminLabel = values.adminLabel;
    if (values.adherentLabel !== undefined) updateData.adherentLabel = values.adherentLabel;
    if (values.hideInExpenses !== undefined) updateData.hideInExpenses = values.hideInExpenses;
    if (values.active !== undefined) updateData.active = values.active;
    if (values.poleId !== undefined) updateData.poleId = values.poleId;
    if (values.rubriqueId !== undefined) updateData.rubriqueId = values.rubriqueId;

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
