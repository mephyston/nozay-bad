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

  const ouverture = await repo.getOpeningBalances(db, season, [account.id]);
  const initialBalanceCents = ouverture.byAccountId.get(account.id) ?? 0;
  const entries = await repo.getEntriesForPeriod(db, season.startDate, asOfDate);
  const bankLines = await repo.getUnreconciledBankLines(db, account.id, season.startDate, asOfDate);
  const statement = (await repo.getLatestBankStatementBalance(db, account.id, asOfDate)) ?? null;
  const lastBankLineDate = (await repo.getLatestBankLineDate(db, account.id)) ?? null;
  const pointableAccountIds = new Set((await repo.getAccountsWithStatements(db)).map((a) => a.id));

  return buildStatement({
    account, season, asOfDate, initialBalanceCents, entries, bankLines, statement, lastBankLineDate,
    pointableAccountIds,
      openingBalanceProvisional: ouverture.provisional
  });
}

interface StatementInputs {
  account: AccountRef;
  season: { id: number; code: string; startDate: string; endDate: string };
  asOfDate: string;
  initialBalanceCents: number;
  /** Toutes les écritures de la période — le tri par compte est l'affaire du calcul. */
  entries: any[];
  bankLines: any[];
  statement: { date: string; balanceCents: number } | null;
  /** La dernière opération détaillée par les relevés du compte, toutes dates confondues. */
  lastBankLineDate: string | null;
  /** Vrai quand l'à-nouveau a été calculé faute de clôture, et peut donc encore bouger. */
  openingBalanceProvisional: boolean;
  /** Identifiants des comptes ayant un relevé, les seuls dont une jambe puisse être pointée. */
  pointableAccountIds: Set<number>;
}

/**
 * Le calcul proprement dit, sans base de données.
 *
 * Il est séparé de la lecture parce que la vue agrégée lit **une** fois pour tous les comptes :
 * `getEntriesForPeriod` ne filtre pas par compte — le calcul le fait, écriture par écriture, via
 * `signedEntryAmountCents` — et la relire une fois par compte revenait à parcourir le grand livre
 * entier trois fois pour en tirer trois nombres différents.
 */
function buildStatement(inputs: StatementInputs): GetReconciliationStatementOutput {
  const {
    account, season, asOfDate, initialBalanceCents, entries, bankLines, statement, lastBankLineDate,
    openingBalanceProvisional, pointableAccountIds
  } = inputs;

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
  /*
   * Seules les jambes portées par un compte à relevé entrent dans ce contrôle : une jambe sur la
   * caisse ou sur le porte-monnaie Badnet ne peut être pointée sur rien, elle n'est donc pas un
   * oubli. Sans ce filtre, tout virement vers un tel compte serait signalé à jamais.
   */
  const halfPointedTransferIds = findHalfPointedTransferIds(
    entries.filter((e: any) => pointableAccountIds.has(e.accountId))
  );

  const expectedBankBalanceCents =
    balance.grossCents - unpointedEntriesTotalCents + unrecordedBankLinesTotalCents;

  const gapCents = statement ? statement.balanceCents - expectedBankBalanceCents : null;

  /*
   * Le cinquième décalage, structurel, que l'écart ne savait pas nommer.
   *
   * La banque tient trois soldes — comptable, en valeur, instantané — et le `<LEDGERBAL>` de
   * l'OFX porte le **comptable**, qui compte déjà les opérations du dernier jour dont l'export
   * ne donne pas encore le détail. Les livres ne reproduisent que les lignes détaillées : ils
   * suivent donc le solde *en valeur*. Confronter l'un à l'autre au dernier jour d'un relevé
   * fait apparaître un écart qui n'est l'anomalie de personne, et qui disparaît au relevé
   * suivant. La comparaison se fait à la date de l'ARRÊTÉ, pas à celle de consultation : c'est
   * l'arrêté qui prétend valoir à une date, et lui seul.
   */
  const statementAheadOfBankLines =
    statement !== null && lastBankLineDate !== null && lastBankLineDate < statement.date;

  unpointedEntries.sort((a, b) => a.date.localeCompare(b.date));
  unrecordedBankLines.sort((a, b) => a.date.localeCompare(b.date));

  return {
    account: { id: account.id, code: account.code, label: account.label! },
    seasonCode: season.code,
    seasonStartDate: season.startDate,
    asOfDate,
    openingBalanceProvisional,
    book: {
      initialBalanceCents,
      grossCents: balance.grossCents,
      inVaultCents: balance.inVaultCents,
      pendingDebitCents: balance.pendingDebitCents,
      bankTheoreticalCents: balance.bankTheoreticalCents
    },
    statement,
    lastBankLineDate,
    statementAheadOfBankLines,
    unpointedEntries,
    unpointedEntriesTotalCents,
    unrecordedBankLines,
    unrecordedBankLinesTotalCents,
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
 *
 * Tout se lit en bloc, avant la boucle. La version précédente rappelait `getReconciliationStatement`
 * par compte, soit sept à huit requêtes chacune — dont la saison et **le grand livre entier**,
 * identiques d'un compte à l'autre. Trois comptes valaient donc une vingtaine d'aller-retours D1
 * séquentiels pour lire trois fois les mêmes écritures.
 */
export async function getReconciliationStatements(
  db: Db,
  input: { seasonId: string; date?: string }
): Promise<GetReconciliationStatementOutput[]> {
  const repo = new GetReconciliationStatementRepository();

  const accounts = await repo.getAccountsWithStatements(db);
  if (accounts.length === 0) return [];

  const season = await getSeasonFromDb(db, input.seasonId);
  if (!season) {
    throw new AppError('Saison introuvable.', 404);
  }

  const accountIds = accounts.map((a) => a.id);
  const latestDates = input.date ? new Map<number, string>() : await repo.getLatestBankStatementDates(db);

  const asOfDates = new Map<number, string>(
    accounts.map((a) => [a.id, input.date ?? latestDates.get(a.id) ?? season.endDate])
  );
  /*
   * La borne haute commune est la plus tardive des dates d'arrêté : chaque compte resserre
   * ensuite sur la sienne. Une borne trop large ne fausse rien — elle ajoute des lignes que le
   * filtre par compte écarte — alors qu'une borne trop courte en perdrait.
   */
  const maxAsOfDate = [...asOfDates.values()].reduce((max, d) => (d > max ? d : max), season.startDate);

  const [ouverture, allEntries, bankLinesByAccount, balancesByAccount, lastLineDates] = await Promise.all([
    repo.getOpeningBalances(db, season, accountIds),
    repo.getEntriesForPeriod(db, season.startDate, maxAsOfDate),
    repo.getUnreconciledBankLinesForAccounts(db, accountIds, season.startDate, maxAsOfDate),
    repo.getBankStatementBalancesForAccounts(db, accountIds),
    repo.getLatestBankLineDates(db, accountIds)
  ]);

  const pointableAccountIds = new Set(accounts.map((a) => a.id));

  return accounts.map((accountRow) => {
    const account: AccountRef = { id: accountRow.id, code: accountRow.code, label: accountRow.label };
    const asOfDate = asOfDates.get(account.id)!;

    const entries = maxAsOfDate === asOfDate
      ? allEntries
      : allEntries.filter((e: any) => e.date <= asOfDate);

    const bankLines = (bankLinesByAccount.get(account.id) ?? [])
      .filter((line: any) => line.date <= asOfDate);

    // Les arrêtés arrivent déjà du plus récent au plus ancien : le premier qui précède la date
    // d'arrêté est le bon.
    const statement = (balancesByAccount.get(account.id) ?? []).find((b) => b.date <= asOfDate) ?? null;

    return buildStatement({
      account,
      season,
      asOfDate,
      initialBalanceCents: ouverture.byAccountId.get(account.id) ?? 0,
      entries,
      bankLines,
      statement,
      lastBankLineDate: lastLineDates.get(account.id) ?? null,
      pointableAccountIds,
      openingBalanceProvisional: ouverture.provisional
    });
  });
}
