import { type Db } from '@nba/db';
import { ListExpensesRepository } from './repository';
import { ListExpensesInput, ListExpensesOutput } from "./dto";

export async function listExpenses(
  db: Db,
  filters: ListExpensesInput
): Promise<ListExpensesOutput> {
  const repo = new ListExpensesRepository();
  return repo.list(db, filters);
}

/**
 * Le contenu des pièces d'une note, pour l'export de la saison : la liste n'en porte
 * plus que le résumé. Une lecture par note — l'export est rare, et charger toutes les
 * pièces d'une saison d'un coup dépasserait la mémoire d'un Worker bien avant D1.
 */
export async function listAttachmentContents(db: Db, expenseId: number) {
  return new ListExpensesRepository().contents(db, expenseId);
}
