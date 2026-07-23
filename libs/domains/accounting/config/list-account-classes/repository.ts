import { type DbOrTx } from '@nba/db';
import { accountClassesTable } from '../../shared/schema';

export class ListAccountClassesRepository {
  async listAccountClasses(db: DbOrTx): Promise<any[]> {
    return db.select().from(accountClassesTable).all();
  }
}
