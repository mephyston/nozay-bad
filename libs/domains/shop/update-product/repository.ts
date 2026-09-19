import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { productsTable } from '../shared/schema';

export class UpdateProductRepository {
  async getById(db: DbOrTx, id: number): Promise<typeof productsTable.$inferSelect | undefined> {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  }

  async update(
    db: DbOrTx,
    id: number,
    values: Partial<Omit<typeof productsTable.$inferInsert, 'id' | 'createdAt'>>
  ): Promise<typeof productsTable.$inferSelect | undefined> {
    return db.update(productsTable).set(values).where(eq(productsTable.id, id)).returning().get();
  }
}
