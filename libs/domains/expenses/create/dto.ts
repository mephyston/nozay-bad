import { expensesTable } from '../shared/schema';
import type { PieceResume } from '../shared/pieces';

export interface CreateExpenseInput {
  seasonId: string;
  description: string;
  category: string | number;
  /** Montant en **centimes** — l'UI convertit avant l'envoi (expense-form-submit.ts). */
  amount: number;
  /** Les pièces jointes, adresses `data:` (photo ou PDF), cinq au plus. */
  attachments?: string[];
  /**
   * L'ancien justificatif unique. Encore accepté, comme une liste d'une pièce : une
   * application installée garde quelque temps l'ancien formulaire en mémoire.
   */
  photoUrl?: string | null;
  emitterName: string;
  memberId?: number | null;
}

export type CreateExpenseOutput = typeof expensesTable.$inferSelect & { attachments: PieceResume[] };
