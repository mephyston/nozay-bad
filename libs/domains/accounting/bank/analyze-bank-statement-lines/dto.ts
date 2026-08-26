export interface AnalyzeBankStatementLinesInput {
  seasonId: string;
  singleId?: number;
}
export interface AnalyzeBankStatementLinesOutput {
  count: number;
  /**
   * Les lignes analysées, suggestions comprises.
   *
   * Elles permettent à l'écran d'afficher le résultat sans se reconstruire : ré-analyser une
   * seule opération lui coûtait auparavant un rendu serveur complet de la page.
   */
  lines?: any[];
}

/**
 * Ce que l'analyse dépose dans `bank_statement_lines.ai_suggestions`.
 *
 * Relu par l'écran de rapprochement pour préremplir le formulaire : tout champ ajouté
 * ici doit y être repris, sans quoi il n'existe que dans la base.
 */
export interface BankStatementLineSuggestion {
  /**
   * La nature du mouvement, et non son imputation.
   *
   * `internal-transfer` désigne un mouvement de compte à compte du club. Il n'a pas de catégorie —
   * le CHECK de `ledger_entries` l'interdit — et ne s'écrit pas depuis le rapprochement, qui ne
   * produit qu'une écriture là où il en faut deux. L'écran propose donc de le saisir au grand
   * livre, puis d'associer chacune des deux lignes de relevé à sa jambe.
   */
  kind?: 'entry' | 'internal-transfer';
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
