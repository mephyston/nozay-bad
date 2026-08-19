import { expensesTable } from '../shared/schema';

export interface ListExpensesInput { season?: string; status?: string; memberId?: number }

export type ListExpensesOutput = (typeof expensesTable.$inferSelect)[];
