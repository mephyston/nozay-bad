import { AppError, type Db } from '@nba/db';
import { GetReconciliationStatementRepository } from './repository';
import { getSeasonFromDb } from '../../shared/accruals';
import {
  computeAccountBalance,
  computeTransitCents,
  findHalfPointedTransferIds,
  signedEntryAmountCents,
  type AccountRef
} from '../../shared/balances';
import {
  GetReconciliationStatementInput,
  GetReconciliationStatementOutput,
  UnpointedEntry,
  UnrecordedBankLine
} from './dto';

/**
 * L'état de rapprochement bancaire d'un compte, à une date d'arrêté.
 *
 * Le pointage existait déjà — `ledger_entries.bank_statement_line_id` d'un côté,
 * `bank_statement_lines.status` de l'autre — mais il n'en sortait aucun nombre. Pointer,
 * c'est apparier ; rapprocher, c'est démontrer que le solde du relevé s'explique
 * intégralement par le solde des livres et par les décalages qui restent.
 *
 * L'identité que cette fonction vérifie :
 *
 *     solde du relevé = solde comptable − écritures non pointées + lignes non comptabilisées
 *
 * en notant que les montants sont signés du point de vue du compte. Ce qui reste après cette
 * égalité — `gapCents` — n'est explicable par aucun décalage de traitement. Quatre causes
 * possibles, dans cet ordre de fréquence : un relevé pas encore importé jusqu'à la date
 * d'arrêté, un virement dont une seule jambe a été pointée (`halfPointedTransferIds`), un
 * appariement inexact (une écriture pointée pour un montant différent de sa ligne), ou un
 * à-nouveau qui ne correspond pas au solde bancaire d'ouverture de l'exercice.
 *
 * La correction par statut (`in_vault`, `pending_debit`) est rendue à part, dans `book` :
 * elle donne le même genre de nombre sans avoir besoin du moindre relevé, et reste donc le
 * seul repère disponible tant qu'aucun fichier OFX n'a été chargé.
 */
export async function getReconciliationStatement(
  db: Db,
  input: GetReconciliationStatementInput
): Promise<GetReconciliationStatementOutput> {
  const repo = new GetReconciliationStatementRepository();

  const accountRow = await repo.getAccountByCode(db, input.accountCode);
  if (!accountRow) {
    throw new AppError(`Compte de trésorerie « ${input.accountCode} » introuvable.`, 404);
  }
  const account: AccountRef = { id: accountRow.id, code: accountRow.code, label: accountRow.label };

  const season = await getSeasonFromDb(db, input.seasonId);
  if (!season) {
    throw new AppError('Saison introuvable.', 404);
  }

  /*
   * La date d'arrêté par défaut est celle du dernier relevé importé, pas la fin de l'exercice :
   * arrêter au 31 août un compte dont le dernier relevé s'arrête au 31 juillet ferait apparaître
   * comme « écart » un mois entier d'opérations que la banque n'a simplement pas encore
   * annoncées.
   */
  const asOfDate = input.date
    ?? (await repo.getLatestBankStatementDate(db, account.id))
    ?? season.endDate;

  const initialBalanceCents = await repo.getInitialBalanceCents(db, season.id, account.id);
  const entries = await repo.getEntriesForPeriod(db, season.startDate, asOfDate);
  const bankLines = await repo.getUnreconciledBankLines(db, account.id, season.startDate, asOfDate);
  const statement = (await repo.getLatestBankStatementBalance(db, account.id, asOfDate)) ?? null;

  const balance = computeAccountBalance(account, initialBalanceCents, entries);

  const unpointedEntries: UnpointedEntry[] = [];
  let unpointedEntriesTotalCents = 0;
  for (const entry of entries) {
    if (entry.bankStatementLineId !== null && entry.bankStatementLineId !== undefined) continue;
    const signedAmountCents = signedEntryAmountCents(entry, account);
    if (signedAmountCents === 0) continue;

    unpointedEntriesTotalCents += signedAmountCents;
    unpointedEntries.push({
      id: entry.id,
      date: entry.date,
      description: entry.description,
      signedAmountCents,
      status: entry.status ?? 'cleared',
      paymentMethodId: entry.paymentMethodId ?? null
    });
  }

  const unrecordedBankLines: UnrecordedBankLine[] = bankLines.map((line: any) => ({
    id: line.id,
    date: line.date,
    name: line.name,
    amountCents: line.amountCents ?? 0,
    status: line.status ?? 'pending'
  }));
  const unrecordedBankLinesTotalCents = unrecordedBankLines.reduce((sum, l) => sum + l.amountCents, 0);
  const ignoredBankLinesTotalCents = unrecordedBankLines
    .filter((l) => l.status === 'ignored')
    .reduce((sum, l) => sum + l.amountCents, 0);

  /*
   * Deux nombres que le modèle à une seule écriture ne savait pas produire.
   *
   * `transitCents` : l'argent sorti d'un compte et pas encore arrivé dans l'autre. Chaque jambe
   * portant sa propre date de valeur, la trésorerie totale baisse réellement pendant le trajet —
   * c'est exact, mais illisible sans le dire.
   *
   * `halfPointedTransferIds` : les virements dont une seule jambe est pointée. C'était l'état
   * normal et inévitable d'avant — une écriture ne pouvait pointer qu'une des deux lignes de
   * relevé — et c'est désormais la seule chose qui puisse encore faire mentir l'écart ci-dessous.
   */
  const transitCents = computeTransitCents(entries, asOfDate);
  const halfPointedTransferIds = findHalfPointedTransferIds(entries);

  const expectedBankBalanceCents =
    balance.grossCents - unpointedEntriesTotalCents + unrecordedBankLinesTotalCents;

  const gapCents = statement ? statement.balanceCents - expectedBankBalanceCents : null;

  unpointedEntries.sort((a, b) => a.date.localeCompare(b.date));
  unrecordedBankLines.sort((a, b) => a.date.localeCompare(b.date));

  return {
    account: { id: account.id, code: account.code, label: accountRow.label },
    seasonCode: season.code,
    seasonStartDate: season.startDate,
    asOfDate,
    book: {
      initialBalanceCents,
      grossCents: balance.grossCents,
      inVaultCents: balance.inVaultCents,
      pendingDebitCents: balance.pendingDebitCents,
      bankTheoreticalCents: balance.bankTheoreticalCents
    },
    statement,
    unpointedEntries,
    unpointedEntriesTotalCents,
    unrecordedBankLines,
    unrecordedBankLinesTotalCents,
    ignoredBankLinesTotalCents,
    transitCents,
    halfPointedTransferIds,
    expectedBankBalanceCents,
    gapCents,
    reconciled: gapCents === 0
  };
}

/**
 * L'état de rapprochement de chaque compte pour lequel un relevé a été importé.
 *
 * Rien n'est codé en dur : un compte sans relevé — la caisse de la buvette — n'a pas de banque
 * à qui se comparer, et l'y faire figurer afficherait un écart permanent égal à son solde.
 */
export async function getReconciliationStatements(
  db: Db,
  input: { seasonId: string; date?: string }
): Promise<GetReconciliationStatementOutput[]> {
  const repo = new GetReconciliationStatementRepository();
  const accounts = await repo.getAccountsWithStatements(db);

  const statements: GetReconciliationStatementOutput[] = [];
  for (const account of accounts) {
    statements.push(await getReconciliationStatement(db, {
      accountCode: account.code,
      seasonId: input.seasonId,
      date: input.date
    }));
  }
  return statements;
}
