import { eq, or } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expensesTable, seasonsTable } from '../shared/schema';

export class CreateExpenseRepository {
  async resolveSeasonId(db: DbOrTx, id: string | number): Promise<number> {
    if (typeof id === 'number') return id;
    const num = Number(id);
    if (!isNaN(num) && Number.isInteger(num)) return num;

    const season = await db.select({ id: seasonsTable.id })
      .from(seasonsTable)
      .where(or(eq(seasonsTable.code, id), eq(seasonsTable.id, num || -1)))
      .get();

    return season ? season.id : 1;
  }

  async create(db: DbOrTx, values: typeof expensesTable.$inferInsert): Promise<typeof expensesTable.$inferSelect> {
    return db.insert(expensesTable).values(values).returning().get();
  }
}

