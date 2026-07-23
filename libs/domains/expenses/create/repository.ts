import { type DbOrTx } from '@metacult/shared-db';
import { expensesTable } from '../shared/schema';

export class CreateExpenseRepository {
  async create(db: DbOrTx, values: typeof expensesTable.$inferInsert): Promise<typeof expensesTable.$inferSelect> {
    return db.insert(expensesTable).values(values).returning().get();
  }
}
