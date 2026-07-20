import { eq } from 'drizzle-orm';
import { accountClassesTable } from '../../data-access/src/schema';

export class DeleteAccountClassRepository {
  async deleteAccountClass(db: any, code: string): Promise<any> {
    return db.delete(accountClassesTable).where(eq(accountClassesTable.code, code)).returning().get();
  }
}
