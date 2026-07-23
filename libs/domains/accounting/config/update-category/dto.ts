import { categoriesTable } from '../../shared/schema';
export type UpdateCategoryId = number;
export interface UpdateCategoryInput { type?: 'recette' | 'depense'; code?: string; label?: string; accountClassCode?: string; adminLabel?: string; hidden?: boolean }
export type UpdateCategoryOutput = typeof categoriesTable.$inferSelect;
