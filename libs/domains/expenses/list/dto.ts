import { expensesTable } from '../shared/schema';

export interface ListExpensesInput { season?: string; status?: string }

export type ListExpensesOutput = (typeof expensesTable.$inferSelect)[];
