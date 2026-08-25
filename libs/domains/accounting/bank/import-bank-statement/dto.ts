export type ParseOFXInput = void;

/** Le solde arrêté par la banque, tel que le bloc `<LEDGERBAL>` du fichier le porte. */
export type ParsedStatementBalance = {
  /** `<DTASOF>`, normalisée en `YYYY-MM-DD`. */
  date: string;
  balanceCents: number;
};

/**
 * Une opération que le fichier contient mais que le découpage ne peut pas atteindre.
 *
 * `parseOFX` découpe sur `<STMTTRN>` et ne lit que le premier jeu de champs de chaque morceau :
 * une opération dont la balise ouvrante manque est collée à la fin de la précédente et
 * disparaît. C'est arrivé pour de vrai — 60,07 € restés invisibles dans un relevé reconstitué
 * jusqu'à ce qu'un rapprochement les réclame, huit mois plus tard.
 */
export type ParsedStatementIssue = {
  date: string | null;
  amountCents: number | null;
  fitid: string | null;
  name: string | null;
};

export type ParseOFXOutput = {
  transactions: { fitid: string; amountCents: number; date: string; name: string; memo: string | null; accountId: 'current' | 'savings' }[];
  /** Absent des relevés qui n'en portent pas — le rapprochement le signale plutôt que de l'inventer. */
  balance: ParsedStatementBalance | null;
  /** Opérations présentes dans le fichier mais hors de tout bloc lisible. */
  issues: ParsedStatementIssue[];
};

export type ImportBankStatementOutput = {
  /** Conservé sous son nom d'origine : nombre de lignes réellement insérées. */
  count: number;
  /** Opérations lues dans le fichier. */
  read: number;
  inserted: number;
  /** Opérations dont l'identifiant était déjà connu : rien à faire, mais il faut le dire. */
  skipped: number;
  accountId: number;
  accountCode: string;
  balanceRecorded: boolean;
  balanceDate: string | null;
  balanceCents: number | null;
};
