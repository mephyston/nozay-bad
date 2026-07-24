import { eq, and, desc } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { membersTable } from '../shared/schema';
import { ledgerEntriesTable, paymentMethodsTable } from '@nba/accounting/schema';

export class MemberCseDataRepository {
  async getById(db: DbOrTx, id: number): Promise<typeof membersTable.$inferSelect | undefined> {
    return db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  }

  async getLastPaymentTransaction(db: DbOrTx, memberId: number): Promise<{ paymentMethod: string; date: string } | undefined> {
    const row = await db.select({
      paymentMethod: paymentMethodsTable.label,
      date: ledgerEntriesTable.date
    })
      .from(ledgerEntriesTable)
      .leftJoin(paymentMethodsTable, eq(ledgerEntriesTable.paymentMethodId, paymentMethodsTable.id))
      .where(and(eq(ledgerEntriesTable.memberId, memberId), eq(ledgerEntriesTable.type, 'recette')))
      .orderBy(desc(ledgerEntriesTable.date))
      .limit(1)
      .get();

    return row ? { paymentMethod: row.paymentMethod || 'virement', date: row.date } : undefined;
  }
}
