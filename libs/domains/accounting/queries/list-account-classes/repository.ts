import { type DbOrTx } from '@metacult/shared-db';
import { accountClassesTable } from '../../shared/schema';

export class ListAccountClassesRepository {
  async listAccountClasses(db: DbOrTx): Promise<any[]> {
    return db.select().from(accountClassesTable).all();
  }
}
