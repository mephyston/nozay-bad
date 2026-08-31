import { bankStatementLinesTable } from '../../shared/schema';

export interface ListBankStatementLinesFilters {
  status?: 'pending' | 'reconciled';
  /** Code (« current ») ou identifiant du compte ; le handler le résout. */
  accountId?: string | number;
  /** Resserre l'intervalle de l'exercice ; il ne peut pas l'élargir. */
  startDate?: string;
  endDate?: string;
  /**
   * Borne le nombre de lignes rendues, les plus récentes d'abord.
   *
   * Sans elle, la liste rend tout ce que les filtres laissent passer — ce que l'écran de
   * rapprochement demandait, et qui lui faisait rapatrier chaque ligne jamais importée.
   */
  limit?: number;
  offset?: number;
}

/** Les filtres se posent sous `filters` ; la racine reste acceptée pour les appelants directs. */
export interface ListBankStatementLinesInput extends ListBankStatementLinesFilters {
  /** Facultatif : sans lui, la liste n'est bornée par aucune date. */
  seasonId?: string;
  filters?: ListBankStatementLinesFilters;
}

export type ListBankStatementLinesOutput = (typeof bankStatementLinesTable.$inferSelect)[];
