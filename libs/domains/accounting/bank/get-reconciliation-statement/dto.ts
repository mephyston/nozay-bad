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

  /** Le côté banque. `null` tant qu'aucun relevé n'a été importé pour ce compte. */
  statement: { date: string; balanceCents: number } | null;

  unpointedEntries: UnpointedEntry[];
  unpointedEntriesTotalCents: number;
  unrecordedBankLines: UnrecordedBankLine[];
  unrecordedBankLinesTotalCents: number;
  /** Part de `unrecordedBankLines` que le trésorier a masquée : de l'argent réellement bougé. */
  ignoredBankLinesTotalCents: number;

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
