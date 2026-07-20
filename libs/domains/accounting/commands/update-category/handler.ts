import { UpdateCategoryRepository } from './repository';

export async function updateCategory(db: any, id: number, body: any) {
  const repo = new UpdateCategoryRepository();
  return repo.updateCategory(db, id, {
    adminLabel: body.adminLabel,
    adherentLabel: body.adherentLabel,
    hideInExpenses: body.hideInExpenses,
    receiptCode: body.receiptCode,
    expenseCode: body.expenseCode
  });
}
