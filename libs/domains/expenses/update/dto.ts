import { expensesTable } from '../shared/schema';

export type ApproveExpenseInput = number;

export type ApproveExpenseOutput = typeof expensesTable.$inferSelect;
