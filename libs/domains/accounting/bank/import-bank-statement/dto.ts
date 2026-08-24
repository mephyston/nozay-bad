export type ParseOFXInput = void;

/** Le solde arrêté par la banque, tel que le bloc `<LEDGERBAL>` du fichier le porte. */
export type ParsedStatementBalance = {
  /** `<DTASOF>`, normalisée en `YYYY-MM-DD`. */
  date: string;
  balanceCents: number;
};

export type ParseOFXOutput = {
  transactions: { fitid: string; amountCents: number; date: string; name: string; memo: string | null; accountId: 'current' | 'savings' }[];
  /** Absent des relevés qui n'en portent pas — le rapprochement le signale plutôt que de l'inventer. */
  balance: ParsedStatementBalance | null;
};
