import { budgetsTable } from '../../shared/schema';
export type UpdateSeasonBudgetSeasonId = string;
export interface UpdateSeasonBudgetInput { items: { categoryId: number; type: 'recette' | 'depense'; amount: number }[] }
export type UpdateSeasonBudgetOutput = (typeof budgetsTable.$inferSelect)[];
