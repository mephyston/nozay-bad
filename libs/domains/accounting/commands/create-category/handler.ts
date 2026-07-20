import { CreateCategoryRepository } from './repository';
import { CreateCategoryInput, CreateCategoryOutput } from "./dto";

export async function createCategory(db: any, body: CreateCategoryInput): Promise<CreateCategoryOutput> {
  const repo = new CreateCategoryRepository();
  return repo.createCategory(db, {
    adminLabel: body.adminLabel,
    adherentLabel: body.adherentLabel,
    hideInExpenses: body.hideInExpenses || false,
    receiptCode: body.receiptCode,
    expenseCode: body.expenseCode,
    createdAt: new Date()
  });
}
