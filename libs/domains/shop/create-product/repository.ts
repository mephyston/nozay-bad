import { type DbOrTx } from '@metacult/shared-db';
import { productsTable } from '../shared/schema';

export class CreateProductRepository {
  async create(db: DbOrTx, values: typeof productsTable.$inferInsert): Promise<typeof productsTable.$inferSelect> {
    return db.insert(productsTable).values(values).returning().get();
  }
}
