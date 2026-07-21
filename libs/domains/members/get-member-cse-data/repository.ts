import { eq, sql } from 'drizzle-orm';
import { membersTable } from '../shared/schema';

export class MemberCseDataRepository {
  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  }

  async getLastPaymentTransaction(db: any, memberId: number): Promise<{ paymentMethod: string; date: string } | undefined> {
    return db.select({
      paymentMethod: sql<string>`payment_method`,
      date: sql<string>`date`
    })
      .from(sql`transactions`)
      .where(sql`member_id = ${memberId} AND type = 'recette'`)
      .orderBy(sql`date DESC`)
      .limit(1)
      .get() as Promise<{ paymentMethod: string; date: string } | undefined>;
  }
}
