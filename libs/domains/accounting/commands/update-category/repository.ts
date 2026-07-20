import { eq } from 'drizzle-orm';
import { categoriesTable } from '../../data-access/src/schema';

export class UpdateCategoryRepository {
  async updateCategory(db: any, id: number, values: {
    adminLabel?: string;
    adherentLabel?: string;
    hideInExpenses?: boolean;
    receiptCode?: string | null;
    expenseCode?: string | null;
  }): Promise<any> {
    return db.update(categoriesTable).set(values).where(eq(categoriesTable.id, id)).returning().get();
  }
}
