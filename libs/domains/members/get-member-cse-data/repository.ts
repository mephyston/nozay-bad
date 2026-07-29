import { membersTable } from '@nba/members/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { getMemberLastPaymentTransaction } from '@nba/accounting-api';

export class MemberCseDataRepository {
  async getById(db: DbOrTx, id: number): Promise<typeof membersTable.$inferSelect | undefined> {
    return db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  }

  async getLastPaymentTransaction(db: DbOrTx, memberId: number): Promise<{ paymentMethod: string; date: string } | undefined> {
    return getMemberLastPaymentTransaction(db, memberId);
  }
}
