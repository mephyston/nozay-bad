import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable, productsTable } from '../shared/schema';
import { getMemberById } from '@nba/members-api';
import { getPaymentMethodByCode as getAccountingPaymentMethodByCode, getSeasonId } from '@nba/accounting-api';

export class CreateOrderRepository {
  async resolveSeasonId(db: DbOrTx, id: string | number): Promise<number> {
    const sId = await getSeasonId(db, id);
    return sId !== undefined ? sId : 1;
  }
  async getProductById(db: DbOrTx, id: number): Promise<typeof productsTable.$inferSelect | undefined> {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  }

  async getMemberById(db: DbOrTx, id: number): Promise<any> {
    return getMemberById(db, id);
  }

  async getPaymentMethodByCode(db: DbOrTx, code: string) {
    return getAccountingPaymentMethodByCode(db, code);
  }

  async create(db: DbOrTx, values: typeof ordersTable.$inferInsert): Promise<typeof ordersTable.$inferSelect> {
    return db.insert(ordersTable).values(values).returning().get();
  }
}
