import { type Db } from '@nba/db';
import { CreateCategoryRepository } from './repository';
import { CreateCategoryInput, CreateCategoryOutput } from "./dto";

export async function createCategory(db: Db, body: CreateCategoryInput): Promise<CreateCategoryOutput> {
  const repo = new CreateCategoryRepository();
  return repo.createCategory(db, {
    adminLabel: body.adminLabel || body.label || '',
    adherentLabel: body.adherentLabel || body.label || '',
    hideInExpenses: body.hideInExpenses || false,
    receiptCode: body.receiptCode,
    expenseCode: body.expenseCode,
    createdAt: new Date()
  } as any);
}
