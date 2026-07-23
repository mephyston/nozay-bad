import { type DbOrTx } from '@metacult/shared-db';
import { eq } from 'drizzle-orm';
import { accountClassesTable } from '../../shared/schema';

export class DeleteAccountClassRepository {
  async deleteAccountClass(db: DbOrTx, code: string): Promise<any> {
    return db.delete(accountClassesTable).where(eq(accountClassesTable.code, code)).returning().get();
  }
}
