import { AppError, type Db } from '@nba/db';
import { CloseSeasonRepository, CloseSeasonRepositoryInterface } from './repository';
import {
  CloseSeasonInput,
  CloseSeasonOutput,
  CloseSeasonCheckResult,
  CloseSeasonCheckItem,
  ReopenSeasonInput,
  ReopenSeasonOutput
} from "./dto";
import { computeAccountBalances, computeTransitCents, findHalfPointedTransferIds } from '../../shared/balances';

export async function getCloseSeasonChecks(
  db: Db,
  seasonIdInput: string | number,
  repo: CloseSeasonRepositoryInterface = new CloseSeasonRepository()
): Promise<CloseSeasonCheckResult> {
  const season = await repo.getSeasonById(db, seasonIdInput);
  if (!season) {
    throw new AppError('Saison introuvable', 404);
  }

  const blockingItems: CloseSeasonCheckItem[] = [];
  const warnings: CloseSeasonCheckItem[] = [];

  if (season.closedAt !== null && season.closedAt !== undefined) {
    blockingItems.push({
      code: 'ALREADY_CLOSED',
      message: `L'exercice comptable est déjà clôturé.`
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (todayStr < season.endDate) {
    blockingItems.push({
      code: 'BEFORE_END_DATE',
      message: `L'exercice n'est pas terminé (date de fin: ${season.endDate}, aujourd'hui: ${todayStr}). Impossible de clôturer un exercice en cours.`
    });
  }

  // Pending bank transactions check
  const pendingBankTxs = await repo.getPendingBankTransactions(db, season.id);
  if (pendingBankTxs.length > 0) {
    blockingItems.push({
      code: 'PENDING_BANK_TRANSACTIONS',
      message: `Il reste ${pendingBankTxs.length} transaction(s) bancaire(s) en statut 'pending' non rapprochée(s).`,
      details: pendingBankTxs.map(t => ({ id: t.id, date: t.date, amountCents: t.amountCents, name: t.name }))
    });
  }

  // Unresolved check deposits check
  const unresolvedDeposits = await repo.getUnresolvedCheckDeposits(db, season.id);
  if (unresolvedDeposits.length > 0) {
    blockingItems.push({
      code: 'UNRESOLVED_CHECK_DEPOSITS',
      message: `Il reste ${unresolvedDeposits.length} remise(s) de chèques non encaissée(s) (statut 'pending' ou 'deposited').`,
      details: unresolvedDeposits.map(d => ({ id: d.id, reference: d.reference, date: d.date, status: d.status }))
    });
  }

  // Unclaimed in_vault checks check
  const inVaultChecks = await repo.getInVaultChecks(db, season.id);
  if (inVaultChecks.length > 0) {
    blockingItems.push({
      code: 'UNCLAIMED_IN_VAULT_CHECKS',
      message: `Il reste ${inVaultChecks.length} chèque(s) en coffre (statut 'received') non remis en banque.`,
      details: inVaultChecks.map(c => ({ id: c.id, number: c.number, emitter: c.emitter, amountCents: c.amountCents }))
    });
  }

  // Unvalidated paid shop orders check
  const unvalidatedPaidOrders = await repo.getUnvalidatedPaidOrders(db, season.id);
  if (unvalidatedPaidOrders.length > 0) {
    const totalCents = unvalidatedPaidOrders.reduce((sum, o) => sum + (o.totalAmountCents || 0), 0);
    blockingItems.push({
      code: 'UNVALIDATED_PAID_ORDERS',
      message: `Il reste ${unvalidatedPaidOrders.length} commande(s) boutique réglée(s) mais non encaissée(s) en comptabilité (Montant total: ${(totalCents / 100).toFixed(2)} €). Encaissement requis avant clôture.`,
      details: unvalidatedPaidOrders.map(o => ({ id: o.id, paidAt: o.paidAt, totalAmountCents: o.totalAmountCents, memberId: o.memberId }))
    });
  }

  // Pending debit transactions check
  const pendingDebitTxs = await repo.getPendingDebitTransactions(db, season.id);
  if (pendingDebitTxs.length > 0) {
    warnings.push({
      code: 'PENDING_DEBIT_TRANSACTIONS',
      message: `Il existe ${pendingDebitTxs.length} écriture(s) en attente de débit ('pending_debit').`,
      details: pendingDebitTxs.map(t => ({ id: t.id, date: t.date, amountCents: t.amountCents, description: t.description }))
    });
  }

  // Cash balance calculation & bank statement discrepancy check
  const dbAccounts = await repo.getAccounts(db);
  const balances = await repo.getSeasonBalances(db, season.id);
  const seasonTxs = await repo.getTransactionsForSeason(db, season.id);

  /*
   * Deux contrôles que le modèle à une seule écriture rendait impossibles.
   *
   * De l'argent encore en route au 31 août appartient à l'exercice qu'on ferme mais ne figure sur
   * aucun compte : le solde reporté à-nouveau est juste, la somme des comptes ne l'explique pas.
   * Il faut le dire avant la clôture, parce qu'après on ne le verra plus.
   *
   * Un virement à jambe unique, lui, est un oubli de pointage : c'est le seul écart de
   * rapprochement qu'aucun décalage bancaire n'explique.
   */
  const transitCents = computeTransitCents(seasonTxs, season.endDate);
  if (transitCents !== 0) {
    warnings.push({
      code: 'CASH_IN_TRANSIT',
      message: `${(transitCents / 100).toFixed(2)} € sont encore en transit au ${season.endDate} : sortis d'un compte, pas encore arrivés dans l'autre. Le solde reporté les comprend, la somme des comptes non.`,
      details: { transitCents, asOfDate: season.endDate }
    });
  }

  const halfPointedTransferIds = findHalfPointedTransferIds(seasonTxs);
  if (halfPointedTransferIds.length > 0) {
    warnings.push({
      code: 'HALF_POINTED_TRANSFERS',
      message: `${halfPointedTransferIds.length} virement(s) interne(s) n'ont qu'une seule jambe pointée : l'état de rapprochement affichera un écart que rien n'explique.`,
      details: { transferIds: halfPointedTransferIds }
    });
  }

  const balancesToRollover: CloseSeasonCheckResult['balancesToRollover'] = [];

  const accountBalances = computeAccountBalances(
    dbAccounts.map((acc: any) => ({ id: acc.id, code: acc.code, label: acc.label })),
    balances,
    seasonTxs
  );

  for (const balance of accountBalances) {
    /*
     * C'est le solde COMPTABLE qui se reporte à-nouveau, pas le bancaire.
     *
     * Un chèque encaissé au 20 août et déposé en septembre reste une recette de l'exercice
     * clos : reporter le solde bancaire théorique le ferait disparaître des livres, et la
     * saison suivante s'ouvrirait amputée du montant du chèque. La correction `in_vault` sert
     * à confronter les livres au relevé, jamais à rectifier les livres.
     */
    balancesToRollover.push({
      accountId: balance.accountId,
      accountCode: balance.accountCode,
      accountLabel: balance.accountLabel ?? balance.accountCode,
      finalBalanceCents: balance.grossCents,
      inVaultCents: balance.inVaultCents,
      pendingDebitCents: balance.pendingDebitCents,
      bankTheoreticalCents: balance.bankTheoreticalCents
    });

    /*
     * Le contrôle que le `if` vide de la version précédente annonçait : le solde bancaire
     * théorique de clôture, confronté au dernier solde que la banque a elle-même annoncé.
     * Un écart ne bloque pas la clôture — il peut n'être qu'un relevé pas encore importé —
     * mais il doit se voir, parce qu'il ne se verra plus jamais après.
     */
    const bankBalance = await repo.getLatestBankStatementBalance(db, balance.accountId, season.endDate);
    if (bankBalance) {
      const gapCents = bankBalance.balanceCents - balance.bankTheoreticalCents;
      if (gapCents !== 0) {
        warnings.push({
          code: 'BANK_STATEMENT_DISCREPANCY',
          message: `Le relevé du compte ${balance.accountLabel ?? balance.accountCode} au ${bankBalance.date} annonce ${(bankBalance.balanceCents / 100).toFixed(2)} €, alors que le solde bancaire théorique de clôture est de ${(balance.bankTheoreticalCents / 100).toFixed(2)} € (écart : ${(gapCents / 100).toFixed(2)} €).`,
          details: {
            accountId: balance.accountId,
            accountCode: balance.accountCode,
            statementDate: bankBalance.date,
            statementBalanceCents: bankBalance.balanceCents,
            bookGrossCents: balance.grossCents,
            bankTheoreticalCents: balance.bankTheoreticalCents,
            gapCents
          }
        });
      }
    }
  }

  // Check next season & existing initial balances
  const nextSeason = await repo.getNextSeason(db, season);
  let existingInitialBalancesOnNextSeason: CloseSeasonCheckResult['existingInitialBalancesOnNextSeason'] = undefined;

  if (nextSeason) {
    const nextBalances = await repo.getSeasonBalances(db, nextSeason.id);
    existingInitialBalancesOnNextSeason = [];

    for (const b of balancesToRollover) {
      const nextBalRow = nextBalances.find(nb => nb.accountId === b.accountId);
      if (nextBalRow) {
        const existingVal = nextBalRow.initialBalanceCents ?? 0;
        const diff = existingVal !== b.finalBalanceCents;

        existingInitialBalancesOnNextSeason.push({
          accountId: b.accountId,
          accountCode: b.accountCode,
          accountLabel: b.accountLabel,
          existingBalanceCents: existingVal,
          newBalanceCents: b.finalBalanceCents,
          discrepancy: diff
        });

        if (diff) {
          warnings.push({
            code: 'CASH_DISCREPANCY',
            message: `Le solde initial du compte ${b.accountLabel} sur la saison suivante (${nextSeason.code}) est de ${existingVal / 100} € alors que le solde de clôture calculé est de ${b.finalBalanceCents / 100} €.`
          });
        }
      }
    }
  }

  const canClose = blockingItems.length === 0;

  return {
    canClose,
    blockingItems,
    warnings,
    balancesToRollover,
    nextSeasonId: nextSeason ? nextSeason.id : null,
    nextSeasonCode: nextSeason ? nextSeason.code : null,
    existingInitialBalancesOnNextSeason
  };
}

export async function closeSeason(
  db: Db,
  input: CloseSeasonInput,
  repo: CloseSeasonRepositoryInterface = new CloseSeasonRepository()
): Promise<CloseSeasonOutput> {
  const seasonId = typeof input === 'string' || typeof input === 'number' ? input : input.seasonId;
  const confirmOverwrite = typeof input === 'object' && input.confirmOverwriteInitialBalances === true;
  const copyBudgets = typeof input === 'object' && input.copyBudgetsToNextSeason === true;

  const checks = await getCloseSeasonChecks(db, seasonId, repo);
  if (!checks.canClose) {
    const msgs = checks.blockingItems.map(i => i.message).join(' | ');
    throw new AppError(`Clôture refusée: ${msgs}`, 400);
  }

  // Check overwrite confirmation requirement
  const hasDiscrepancy = checks.existingInitialBalancesOnNextSeason?.some(b => b.discrepancy);
  if (hasDiscrepancy && !confirmOverwrite) {
    throw new AppError("Des soldes initiaux existent déjà sur la saison suivante et diffèrent des soldes de clôture. Confirmation explicite requise (confirmOverwriteInitialBalances = true).", 400);
  }

  const result = await repo.closeSeasonWithRollover(
    db,
    seasonId,
    checks.nextSeasonId || null,
    checks.balancesToRollover,
    copyBudgets
  );

  return result;
}

export async function reopenSeason(
  db: Db,
  input: ReopenSeasonInput,
  repo: CloseSeasonRepositoryInterface = new CloseSeasonRepository()
): Promise<ReopenSeasonOutput> {
  const seasonId = typeof input === 'string' || typeof input === 'number' ? input : input.seasonId;

  const season = await repo.getSeasonById(db, seasonId);
  if (!season) {
    throw new AppError('Saison introuvable', 404);
  }
  if (!season.closedAt) {
    throw new AppError('Saison non clôturée. Impossible de réouvrir.', 400);
  }

  const nextSeason = await repo.getNextSeason(db, season);
  const result = await repo.reopenSeason(db, season.id, nextSeason ? nextSeason.id : null);

  return result;
}
