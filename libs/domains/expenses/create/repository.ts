import { expensesTable } from '../data-access/src/schema';
import { CreateExpenseRepositoryInterface } from '../shared/repository';

export class CreateExpenseRepository implements CreateExpenseRepositoryInterface {
  async create(db: any, values: {
    seasonId: string;
    description: string;
    category: number;
    amount: number;
    photoUrl: string | null;
    status: 'pending';
    emitterName: string;
    memberId: number | null;
    createdAt: Date;
  }): Promise<any> {
    return db.insert(expensesTable).values(values).returning().get();
  }
}
