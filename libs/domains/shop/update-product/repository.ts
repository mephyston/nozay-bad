import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { productsTable } from '../shared/schema';

export class UpdateProductRepository {
  async update(db: DbOrTx, id: number, values: {
    name?: string;
    priceCents?: number;
    stock?: number;
    trackStock?: boolean;
    active?: boolean;
  }): Promise<typeof productsTable.$inferSelect | undefined> {
    return db.update(productsTable).set(values).where(eq(productsTable.id, id)).returning().get();
  }
}
