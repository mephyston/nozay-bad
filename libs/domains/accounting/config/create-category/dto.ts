import { categoriesTable } from '../../shared/schema';
export interface CreateCategoryInput { type: 'recette' | 'depense'; code: string; label: string; accountClassCode?: string; adminLabel?: string; hidden?: boolean }
export type CreateCategoryOutput = typeof categoriesTable.$inferSelect;
