import { categoriesTable } from '@nba/accounting/schema';

export type UpdateCategoryId = number;
export interface UpdateCategoryInput { type?: 'recette' | 'depense'; code?: string; label?: string; accountClassCode?: string; adminLabel?: string; adherentLabel?: string; hideInExpenses?: boolean; receiptCode?: string | null; expenseCode?: string | null; hidden?: boolean; receiptAccountClassId?: number | null; expenseAccountClassId?: number | null; active?: boolean }
export type UpdateCategoryOutput = typeof categoriesTable.$inferSelect;
