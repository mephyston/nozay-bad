import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { accountClassesTable } from '../../shared/schema';

export class UpdateAccountClassRepository {
  async updateAccountClass(db: DbOrTx, code: string, values: {
    label?: string;
    type?: 'recette' | 'depense';
  }): Promise<any> {
    const numCode = Number(code);
    const targetCode = !isNaN(numCode) ? String(numCode) : code;
    return db.update(accountClassesTable).set(values).where(eq(accountClassesTable.code, targetCode)).returning().get();
  }
}
