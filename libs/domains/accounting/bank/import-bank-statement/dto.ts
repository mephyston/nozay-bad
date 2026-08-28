export type ParseOFXInput = void;

/** Le solde arrêté par la banque, tel que le bloc `<LEDGERBAL>` du fichier le porte. */
export type ParsedStatementBalance = {
  /** `<DTASOF>`, normalisée en `YYYY-MM-DD`. */
  date: string;
  balanceCents: number;
};

/**
 * Une opération que le fichier porte mais que l'import ne peut pas lire.
 *
 * Deux façons de disparaître, et il a fallu les deux pour fermer le trou :
 *
 * - `orphan` — la balise ouvrante manque. `parseOFX` découpe sur `<STMTTRN>` et ne lit que le
 *   premier jeu de champs de chaque morceau : l'opération est collée à la fin de la précédente
 *   et n'est jamais atteinte. C'est arrivé pour de vrai — 60,07 € restés invisibles dans un
 *   relevé reconstitué jusqu'à ce qu'un rapprochement les réclame, huit mois plus tard.
 * - `incomplete` — le bloc est bien délimité mais un champ obligatoire manque. La lecture
 *   l'écartait alors d'un `continue` muet : ni comptée dans `read`, ni dans `skipped`, ni
 *   signalée. Une opération sans `<NAME>` — le cas d'une écriture de frais chez certaines
 *   banques — s'évaporait sans laisser de trace, exactement comme la précédente.
 */
export type ParsedStatementIssue = {
  kind: 'orphan' | 'incomplete';
  /** Les balises attendues qui manquent. Vide pour un `orphan`, qui n'en manque aucune. */
  missing?: string[];
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
