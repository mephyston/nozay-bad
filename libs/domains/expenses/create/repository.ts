import { getSeasonId } from '@nba/accounting-api';
import { eq, or } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { expensesTable } from '../shared/schema';

export class CreateExpenseRepository {
  /** `undefined` si le code de saison est inconnu : au handler de refuser. */
  async resolveSeasonId(db: DbOrTx, id: string | number): Promise<number | undefined> {
    return getSeasonId(db, id);
  }

  async create(db: DbOrTx, values: typeof expensesTable.$inferInsert): Promise<typeof expensesTable.$inferSelect> {
    return db.insert(expensesTable).values(values).returning().get();
  }
}

