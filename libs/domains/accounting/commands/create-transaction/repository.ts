import { transactionsTable } from '../../shared/schema';

export class CreateTransactionRepository {
  async create(db: any, values: any): Promise<any> {
    return db.insert(transactionsTable).values(values).returning().get();
  }
}
