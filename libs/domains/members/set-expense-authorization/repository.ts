import { membershipsTable } from '@nba/members/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';

/** Le droit se donne pour une saison : il porte sur l'adhésion, pas sur la personne. */
export async function updateExpenseAuthorization(db: DbOrTx, id: number, authorized: boolean): Promise<void> {
  await db.update(membershipsTable).set({ expenseAuthorized: authorized }).where(eq(membershipsTable.id, id)).run();
}
