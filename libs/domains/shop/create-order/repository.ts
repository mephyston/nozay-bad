import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable, productsTable } from '../shared/schema';
import { getMemberById } from '@nba/members-api';

export class CreateOrderRepository {
  async getProductById(db: DbOrTx, id: number): Promise<typeof productsTable.$inferSelect | undefined> {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  }

  async getMemberById(db: DbOrTx, id: number): Promise<any> {
    return getMemberById(db, id);
  }

  async create(db: DbOrTx, values: typeof ordersTable.$inferInsert): Promise<typeof ordersTable.$inferSelect> {
    return db.insert(ordersTable).values(values).returning().get();
  }
}
