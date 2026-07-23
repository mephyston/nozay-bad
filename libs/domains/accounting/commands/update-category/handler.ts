import { type Db } from '@metacult/shared-db';
import { UpdateCategoryRepository } from './repository';
import { UpdateCategoryId, UpdateCategoryInput, UpdateCategoryOutput } from "./dto";

export async function updateCategory(db: Db, id: UpdateCategoryId, body: UpdateCategoryInput): Promise<UpdateCategoryOutput> {
  const repo = new UpdateCategoryRepository();
  return repo.updateCategory(db, id, {
    adminLabel: body.adminLabel,
    adherentLabel: body.adherentLabel,
    hideInExpenses: body.hideInExpenses,
    receiptCode: body.receiptCode,
    expenseCode: body.expenseCode
  });
}
