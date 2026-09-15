import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { accountClassesTable } from '../../shared/schema';

export class UpdateAccountClassRepository {
  async updateAccountClass(db: DbOrTx, code: string, values: {
    label?: string;
    type?: 'recette' | 'depense';
  }): Promise<any> {
    // Le code est un texte, comparé tel quel : le passer par `Number` faisait de « 060 » un « 60 ».
    return db.update(accountClassesTable).set(values).where(eq(accountClassesTable.code, String(code).trim())).returning().get();
  }
}
