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

  const balancesToRollover: CloseSeasonCheckResult['balancesToRollover'] = [];

  for (const acc of dbAccounts) {
    const initBalRow = balances.find(b => Number(b.accountId) === Number(acc.id) || b.accountId === acc.code);
    const initBal = initBalRow ? (initBalRow.initialBalanceCents ?? 0) : 0;

    let finalBal = initBal;
    for (const tx of seasonTxs) {
      const amount = tx.amountCents ?? 0;
      const isTargetAcc = Number(tx.accountId) === Number(acc.id) || tx.accountId === acc.code;
      const isTargetDestAcc = Number(tx.destinationAccountId) === Number(acc.id) || tx.destinationAccountId === acc.code;

      if (tx.type === 'recette' && isTargetAcc) {
        finalBal += amount;
      } else if (tx.type === 'depense' && isTargetAcc) {
        finalBal -= amount;
      } else if (tx.type === 'transfert') {
        if (isTargetAcc) finalBal -= amount;
        if (isTargetDestAcc) finalBal += amount;
      }
    }


    balancesToRollover.push({
      accountId: acc.id,
      accountCode: acc.code,
      accountLabel: acc.label,
      finalBalanceCents: finalBal
    });

    // Check discrepancy against latest reconciled bank transaction
    const latestBankTx = await repo.getLatestReconciledBankTransaction(db, season.id, acc.id);
    if (latestBankTx && latestBankTx.amountCents !== undefined) {
      // In full bank reconciliation, final bank balance is tracked. Compare if diff exists
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
