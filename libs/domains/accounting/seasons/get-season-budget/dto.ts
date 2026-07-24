import { seasonCategoryBudgetsTable } from '../../shared/schema';
export type GetSeasonBudgetInput = string;
export type GetSeasonBudgetOutput = (typeof seasonCategoryBudgetsTable.$inferSelect)[];
