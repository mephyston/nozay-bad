import { CategoriesRepository } from './repository';

export async function listCategories(db: any) {
  const repo = new CategoriesRepository();
  return repo.listCategories(db);
}

export async function createCategory(db: any, body: any) {
  const repo = new CategoriesRepository();
  return repo.createCategory(db, {
    adminLabel: body.adminLabel,
    adherentLabel: body.adherentLabel,
    hideInExpenses: body.hideInExpenses || false,
    receiptCode: body.receiptCode,
    expenseCode: body.expenseCode,
    createdAt: new Date()
  });
}

export async function updateCategory(db: any, id: number, body: any) {
  const repo = new CategoriesRepository();
  return repo.updateCategory(db, id, {
    adminLabel: body.adminLabel,
    adherentLabel: body.adherentLabel,
    hideInExpenses: body.hideInExpenses,
    receiptCode: body.receiptCode,
    expenseCode: body.expenseCode
  });
}

export async function deleteCategory(db: any, id: number) {
  const repo = new CategoriesRepository();
  return repo.deleteCategory(db, id);
}

export async function listAccountClasses(db: any) {
  const repo = new CategoriesRepository();
  return repo.listAccountClasses(db);
}

export async function createAccountClass(db: any, body: any) {
  const repo = new CategoriesRepository();
  return repo.createAccountClass(db, {
    code: body.code.trim(),
    label: body.label.trim(),
    type: body.type,
    createdAt: new Date()
  });
}

export async function updateAccountClass(db: any, code: string, body: any) {
  const repo = new CategoriesRepository();
  return repo.updateAccountClass(db, code, {
    label: body.label?.trim(),
    type: body.type
  });
}

export async function deleteAccountClass(db: any, code: string) {
  const repo = new CategoriesRepository();
  return repo.deleteAccountClass(db, code);
}
