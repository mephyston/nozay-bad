import { type DbOrTx } from '@nba/db';
import { ledgerEntriesTable } from '../../shared/schema';

export class CreateTransactionRepository {
  async create(db: DbOrTx, values: any): Promise<any> {
    return db.insert(ledgerEntriesTable).values(values).returning().get();
  }
}
