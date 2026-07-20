import { transactionsTable } from '../../data-access/src/schema';

export class CreateTransactionRepository {
  async create(db: any, values: any): Promise<any> {
    return db.insert(transactionsTable).values(values).returning().get();
  }
}
