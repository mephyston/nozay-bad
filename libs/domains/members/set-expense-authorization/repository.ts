import { membersTable } from '@nba/members/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';

export async function updateExpenseAuthorization(db: DbOrTx, id: number, authorized: boolean): Promise<void> {
  await db.update(membersTable).set({ expenseAuthorized: authorized }).where(eq(membersTable.id, id)).run();
}
