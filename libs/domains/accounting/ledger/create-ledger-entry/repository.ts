import { type DbOrTx } from '@nba/db';
import { ledgerEntriesTable } from '../../shared/schema';

export class CreateTransactionRepository {
  buildCreateStatement(db: DbOrTx, values: any): any {
    return db.insert(ledgerEntriesTable).values(values);
  }

  async create(db: DbOrTx, values: any): Promise<any> {
    return db.insert(ledgerEntriesTable).values(values).returning().get();
  }
}
