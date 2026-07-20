import { accountClassesTable } from '../../data-access/src/schema';

export class ListAccountClassesRepository {
  async listAccountClasses(db: any): Promise<any[]> {
    return db.select().from(accountClassesTable).all();
  }
}
