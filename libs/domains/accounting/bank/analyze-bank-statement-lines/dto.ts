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
  /**
   * Exercice de rattachement, au format court « 26-27 », ou `null` pour celui qu'on consulte.
   *
   * Le motif du virement le nomme, et l'analyse le lit déjà pour décider du produit
   * constaté d'avance — c'est le même millésime. Ne pas le transmettre laissait l'écran
   * rattacher l'encaissement à l'exercice affiché : la note disait « à rattacher à 26-27 »
   * et `season_id` valait 25-26, sans que rien ne signale la contradiction.
   */
  targetSeason: string | null;
}
