/**
 * La forme de l'état de rapprochement telle que l'écran la reçoit.
 *
 * Recopiée du DTO plutôt qu'importée : l'UI est servie à l'admin par le proxy Astro, qui n'a
 * accès qu'au JSON, et le reste des écrans comptables suit déjà cette convention.
 */
export interface ReconciliationStatementView {
  account: { id: number; code: string; label: string };
  seasonCode: string;
  seasonStartDate: string;
  asOfDate: string;
  book: {
    initialBalanceCents: number;
    grossCents: number;
    inVaultCents: number;
    pendingDebitCents: number;
    bankTheoreticalCents: number;
  };
  statement: { date: string; balanceCents: number } | null;
  /** La dernière opération que le relevé détaille. */
  lastBankLineDate: string | null;
  /** L'arrêté est postérieur à cette dernière opération : il devance son propre détail. */
  statementAheadOfBankLines: boolean;
  unpointedEntries: {
    id: number;
    date: string;
    description: string;
    signedAmountCents: number;
    status: string;
    paymentMethodId: number | null;
  }[];
  unpointedEntriesTotalCents: number;
  unrecordedBankLines: {
    id: number;
    date: string;
    name: string;
    amountCents: number;
    status: string;
  }[];
  unrecordedBankLinesTotalCents: number;
  expectedBankBalanceCents: number;
  gapCents: number | null;
  reconciled: boolean;
}
