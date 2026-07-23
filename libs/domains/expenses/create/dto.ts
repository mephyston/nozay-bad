import { expensesTable } from '../shared/schema';

export interface CreateExpenseInput {
  seasonId: string;
  description: string;
  category: string | number;
  amount: number;
  photoUrl?: string | null;
  emitterName: string;
  memberId?: number | null;
}

export type CreateExpenseOutput = typeof expensesTable.$inferSelect;
