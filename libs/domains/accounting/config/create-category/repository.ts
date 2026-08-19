import { categoriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { accountClassesTable } from '../../shared/schema';

export class CreateCategoryRepository {
  async createCategory(db: DbOrTx, values: {
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses?: boolean;
    receiptAccountClassId?: number | null;
    expenseAccountClassId?: number | null;
    receiptCode?: string | null;
    expenseCode?: string | null;
    createdAt?: Date;
  }): Promise<any> {
    let receiptAccountClassId = values.receiptAccountClassId ?? null;
    let expenseAccountClassId = values.expenseAccountClassId ?? null;

    if (!receiptAccountClassId && values.receiptCode) {
      const cls = await db.select().from(accountClassesTable).where(eq(accountClassesTable.code, values.receiptCode)).get();
      if (cls) receiptAccountClassId = cls.id;
    }

    if (!expenseAccountClassId && values.expenseCode) {
      const cls = await db.select().from(accountClassesTable).where(eq(accountClassesTable.code, values.expenseCode)).get();
      if (cls) expenseAccountClassId = cls.id;
    }

    const insertData = {
      adminLabel: values.adminLabel,
      adherentLabel: values.adherentLabel,
      hideInExpenses: !!values.hideInExpenses,
      receiptAccountClassId,
      expenseAccountClassId,
      createdAt: values.createdAt || new Date()
    };

    return db.insert(categoriesTable).values(insertData).returning().get();
  }
}
