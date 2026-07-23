import { budgetsTable } from '../../shared/schema';
export type GetSeasonBudgetInput = string;
export type GetSeasonBudgetOutput = (typeof budgetsTable.$inferSelect)[];
