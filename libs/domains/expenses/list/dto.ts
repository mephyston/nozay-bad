import { expensesTable } from '../shared/schema';
import type { PieceResume } from '../shared/pieces';

export interface ListExpensesInput { season?: string; status?: string; memberId?: number }

/** Une note sans le contenu de ses pièces : seulement de quoi les ouvrir. */
export type ExpenseSummary = Omit<typeof expensesTable.$inferSelect, 'photoUrl'> & { attachments: PieceResume[] };

export type ListExpensesOutput = ExpenseSummary[];
