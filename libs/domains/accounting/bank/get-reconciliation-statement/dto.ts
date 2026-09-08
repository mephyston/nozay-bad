export type GetReconciliationStatementInput = {
  accountCode: string;
  seasonId: string;
  /** Date d'arrêté. À défaut, celle du dernier relevé importé, sinon la fin de l'exercice. */
  date?: string;
};

/** Une écriture des livres qu'aucune ligne de relevé ne porte. */
export type UnpointedEntry = {
  id: number;
  date: string;
  description: string;
  /** Signé du point de vue du compte : positif s'il l'augmente. */
  signedAmountCents: number;
  status: string;
  paymentMethodId: number | null;
  /**
   * Datée avant l'ouverture de l'exercice, mais comprise dans l'à-nouveau reconstitué.
   *
   * Tant que l'exercice précédent n'est pas clôturé, l'à-nouveau cumule les mouvements par
   * date depuis le dernier report figé — pointés ou non. Une écriture de cette période que
   * rien ne rapproche est donc dans les livres sans être en banque, exactement comme une
   * non-pointée de l'exercice : elle se retranche de la même façon. Le cas typique est le
   * chèque encaissé fin août et déposé en septembre ; le cas qui l'a révélé, une recette de
   * 26-27 datée par erreur de 25-26 (110,00 € d'écart le 08/09/2026, qu'aucune ligne ne nommait).
   */
  beforeSeason: boolean;
};

/** Une ligne de relevé qu'aucune écriture ne porte. */
export type UnrecordedBankLine = {
  id: number;
  date: string;
  name: string;
  amountCents: number;
  status: string;
};

export type GetReconciliationStatementOutput = {
  account: { id: number; code: string; label: string };
  seasonCode: string;
  seasonStartDate: string;
  asOfDate: string;

  /** Le côté livres. */
  book: {
    initialBalanceCents: number;
    /** À-nouveau + écritures : le solde comptable. */
    grossCents: number;
    inVaultCents: number;
    pendingDebitCents: number;
    /** `grossCents − inVaultCents + pendingDebitCents`, déduit des seuls statuts. */
    bankTheoreticalCents: number;
  };

  /**
   * L'à-nouveau a été calculé faute de clôture, et n'est donc pas encore arrêté.
   *
   * `season_balances` n'est écrit qu'à la clôture de l'exercice précédent. Tant qu'elle n'a pas
   * eu lieu — l'état normal plusieurs mois par an — le solde d'ouverture est reconstitué depuis
   * le dernier report figé. Le nombre est juste : aucune régularisation de fin d'exercice ne
   * peut déplacer la trésorerie au 31 août, une charge à payer étant par définition datée
   * après. Mais il n'est pas *arrêté*, et l'écran doit le dire plutôt que d'afficher un solde
   * dont personne ne sait s'il fait foi.
   */
  openingBalanceProvisional: boolean;

  /** Le côté banque. `null` tant qu'aucun relevé n'a été importé pour ce compte. */
  statement: { date: string; balanceCents: number } | null;

  /** La dernière opération que le relevé détaille. `null` si le compte n'a aucune ligne. */
  lastBankLineDate: string | null;
  /**
   * L'arrêté est postérieur à la dernière opération détaillée.
   *
   * La banque ne tient pas un solde mais trois — comptable, en valeur, instantané — et
   * `<LEDGERBAL>` porte le **comptable** : il compte déjà les opérations du dernier jour dont
   * l'export ne donne pas encore le détail. Les livres, eux, ne reproduisent que les lignes
   * détaillées, soit le solde *en valeur*. Au dernier jour de chaque relevé, l'écart qui en
   * résulte n'est pas une anomalie mais une avance de l'arrêté sur son propre détail — elle se
   * résorbe au relevé suivant, sans rien corriger.
   *
   * Constaté le 2026-08-28 : 176,00 € entre un arrêté au 27/08 et des opérations qui
   * s'arrêtaient au 26/08. L'écran les présentait comme « n'est explicable par aucun décalage ».
   */
  statementAheadOfBankLines: boolean;

  unpointedEntries: UnpointedEntry[];
  unpointedEntriesTotalCents: number;
  unrecordedBankLines: UnrecordedBankLine[];
  unrecordedBankLinesTotalCents: number;

  /** `grossCents − unpointedEntriesTotalCents + unrecordedBankLinesTotalCents`. */
  /** L'argent parti d'un compte et pas encore arrivé dans l'autre, à la date d'arrêté. */
  transitCents: number;
  /** Les virements dont une seule des deux jambes est pointée : une anomalie, pas un décalage. */
  halfPointedTransferIds: number[];
  expectedBankBalanceCents: number;
  /** `statement.balanceCents − expectedBankBalanceCents`. `null` faute de relevé. */
  gapCents: number | null;
  /** Vrai quand l'écart est nul : le rapprochement boucle. */
  reconciled: boolean;
};
