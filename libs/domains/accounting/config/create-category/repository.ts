import { type DbOrTx } from '@nba/db';
import { categoriesTable } from '../../shared/schema';

export class CreateCategoryRepository {
  async createCategory(db: DbOrTx, values: {
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses?: boolean;
    receiptCode?: string | null;
    expenseCode?: string | null;
    createdAt?: Date;
  }): Promise<any> {
    return db.insert(categoriesTable).values(values as any).returning().get();
  }
}
