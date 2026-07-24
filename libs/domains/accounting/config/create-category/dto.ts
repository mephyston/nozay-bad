import { categoriesTable } from '../../shared/schema';
export interface CreateCategoryInput { type?: 'recette' | 'depense'; code?: string; label?: string; accountClassCode?: string; adminLabel?: string; adherentLabel?: string; hideInExpenses?: boolean; receiptCode?: string | null; expenseCode?: string | null; hidden?: boolean }
export type CreateCategoryOutput = typeof categoriesTable.$inferSelect;
