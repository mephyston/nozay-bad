import { type DbOrTx } from '@metacult/shared-db';
import { eq } from 'drizzle-orm';
import { accountClassesTable } from '../../shared/schema';

export class UpdateAccountClassRepository {
  async updateAccountClass(db: DbOrTx, code: string, values: {
    label?: string;
    type?: 'recette' | 'depense';
  }): Promise<any> {
    return db.update(accountClassesTable).set(values).where(eq(accountClassesTable.code, code)).returning().get();
  }
}
