import { getSeasonId } from '@nba/accounting-api';
import { eq, or } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expensesTable } from '../shared/schema';

export class CreateExpenseRepository {
  async resolveSeasonId(db: DbOrTx, id: string | number): Promise<number> {
    const sId = await getSeasonId(db, id);
    return sId !== undefined ? sId : 1;
  }

  async create(db: DbOrTx, values: typeof expensesTable.$inferInsert): Promise<typeof expensesTable.$inferSelect> {
    return db.insert(expensesTable).values(values).returning().get();
  }
}

