import { CreateCategoryRepository } from './repository';

export async function createCategory(db: any, body: any) {
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
