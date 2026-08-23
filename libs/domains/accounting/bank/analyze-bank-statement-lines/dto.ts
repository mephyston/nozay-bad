export interface AnalyzeBankStatementLinesInput {
  seasonId: string;
  singleId?: number;
}
export interface AnalyzeBankStatementLinesOutput {
  count: number;
}

/**
 * Ce que l'analyse dépose dans `bank_statement_lines.ai_suggestions`.
 *
 * Relu par l'écran de rapprochement pour préremplir le formulaire : tout champ ajouté
 * ici doit y être repris, sans quoi il n'existe que dans la base.
 */
export interface BankStatementLineSuggestion {
  category: number;
  memberId: number | null;
  memberName: string | null;
  confidence: number;
  /** Rattachement d'exercice déduit du libellé. `normal` dans l'immense majorité des cas. */
  accrualType: 'normal' | 'produit_constate_avance';
  /** Phrase à reprendre telle quelle dans l'écriture, quand le rattachement n'est pas `normal`. */
  accrualNote: string | null;
}
