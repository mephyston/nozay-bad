import { accountClassesTable } from '../../shared/schema';

export class ListAccountClassesRepository {
  async listAccountClasses(db: any): Promise<any[]> {
    return db.select().from(accountClassesTable).all();
  }
}
