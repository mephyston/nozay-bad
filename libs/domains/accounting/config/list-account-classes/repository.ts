import { type DbOrTx } from '@nba/db';
import { asc } from 'drizzle-orm';
import { accountClassesTable } from '../../shared/schema';

export class ListAccountClassesRepository {
  /*
   * Dans l'ordre du plan comptable (4, 5, 6, 7), pas dans celui des insertions : une classe
   * ajoutée par migration — la 467 des fonds d'adhérents — arrivait en queue de liste, après
   * la 75, là où personne ne la cherche.
   */
  async listAccountClasses(db: DbOrTx): Promise<any[]> {
    return db.select().from(accountClassesTable).orderBy(asc(accountClassesTable.code)).all();
  }
}
