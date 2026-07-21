import { accountClassesTable } from '../../shared/schema';

export class CreateAccountClassRepository {
  async createAccountClass(db: any, values: {
    code: string;
    label: string;
    type: 'recette' | 'depense';
    createdAt?: Date;
  }): Promise<any> {
    return db.insert(accountClassesTable).values(values).returning().get();
  }
}
