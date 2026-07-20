import { eq } from 'drizzle-orm';
import { categoriesTable, accountClassesTable } from '../data-access/src/schema';

export class CategoriesRepository {
  async listCategories(db: any): Promise<any[]> {
    return db.select().from(categoriesTable).all();
  }

  async createCategory(db: any, values: {
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses?: boolean;
    receiptCode?: string | null;
    expenseCode?: string | null;
    createdAt?: Date;
  }): Promise<any> {
    return db.insert(categoriesTable).values(values).returning().get();
  }

  async updateCategory(db: any, id: number, values: {
    adminLabel?: string;
    adherentLabel?: string;
    hideInExpenses?: boolean;
    receiptCode?: string | null;
    expenseCode?: string | null;
  }): Promise<any> {
    return db.update(categoriesTable).set(values).where(eq(categoriesTable.id, id)).returning().get();
  }

  async deleteCategory(db: any, id: number): Promise<any> {
    return db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning().get();
  }

  async listAccountClasses(db: any): Promise<any[]> {
    return db.select().from(accountClassesTable).all();
  }

  async createAccountClass(db: any, values: {
    code: string;
    label: string;
    type: 'recette' | 'depense';
    createdAt?: Date;
  }): Promise<any> {
    return db.insert(accountClassesTable).values(values).returning().get();
  }

  async updateAccountClass(db: any, code: string, values: {
    label?: string;
    type?: 'recette' | 'depense';
  }): Promise<any> {
    return db.update(accountClassesTable).set(values).where(eq(accountClassesTable.code, code)).returning().get();
  }

  async deleteAccountClass(db: any, code: string): Promise<any> {
    return db.delete(accountClassesTable).where(eq(accountClassesTable.code, code)).returning().get();
  }
}
