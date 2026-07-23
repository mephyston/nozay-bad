import { type DbOrTx } from '@metacult/shared-db';
import { transactionsTable } from '../../shared/schema';

export class CreateTransactionRepository {
  async create(db: DbOrTx, values: any): Promise<any> {
    return db.insert(transactionsTable).values(values).returning().get();
  }
}
