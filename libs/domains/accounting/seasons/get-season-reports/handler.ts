import { type Db, AppError } from '@nba/db';
import { normalizeCategory } from '../../shared/helpers';
import { GetSeasonReportsRepository } from './repository';
import { GetSeasonReportsInput, GetSeasonReportsOutput, CategoryProjection, DeferredCashBreakdown } from "./dto";
import { getSeasonFromDb } from '../../shared/accruals';
import { generateTreasuryForecast } from './forecast-engine';

export async function getSeasonReports(db: Db, input: GetSeasonReportsInput): Promise<GetSeasonReportsOutput> {
  const seasonId = typeof input === 'string' ? input : input.seasonId;
  const arretedAu = typeof input === 'string' ? undefined : input.arretedAu;

  const repo = new GetSeasonReportsRepository();
  const season = await getSeasonFromDb(db, seasonId);
  if (!season) {
    throw new AppError("Saison introuvable.", 404);
  }

  // Validate cutoff date if provided
  let effectiveEndDate = season.endDate;
  if (arretedAu) {
    effectiveEndDate = arretedAu;
  }

  const balances = await repo.getBalances(db, season.id);
  const allTxs = await repo.getTransactionsForSeason(db, season.id);
  const dbCategories = await repo.getAllCategories(db);

  // 1. Compte de Résultat (Income Statement)
  const categoryTotals: Record<string, { type: 'recette' | 'depense', total: number, categoryName?: string }> = {};
  let totalRecettes = 0;
  let totalDepenses = 0;

  const virementInterneCatId = dbCategories.find((c: any) => c.adminLabel && c.adminLabel.startsWith('Virements Internes'))?.id;

  for (const tx of allTxs) {
    if (tx.type === 'transfert') continue;
    // Exclude transactions dated after cut-off date
    if (tx.date > effectiveEndDate) continue;

    const amount = tx.amountCents ?? 0;
    const catId = normalizeCategory(tx.categoryId ?? tx.category);
    
    // Ignore manual internal transfers for revenue/expense calculations
    if (catId === virementInterneCatId) continue;

    const cat = catId !== null ? catId.toString() : 'divers';
    const key = `${cat}_${tx.type}`;

    let categoryName = 'Non catégorisé';
    if (catId !== null) {
      const catObj = dbCategories.find(c => c.id === catId);
      if (catObj) {
        categoryName = catObj.adminLabel;
      }
    }

    if (!categoryTotals[key]) {
      categoryTotals[key] = { type: tx.type, total: 0, categoryName };
    }
    categoryTotals[key].total += amount;

    if (tx.type === 'recette') {
      totalRecettes += amount;
    } else {
      totalDepenses += amount;
    }
  }

  // 2. Bilan de Trésorerie (Cash Flow Statement)
  const dbAccounts = await repo.getAccounts(db);
  const accountTypes: ('current' | 'savings' | 'cash')[] = ['current', 'savings', 'cash'];
  const periodTxs = await repo.getTransactionsForPeriod(db, season.startDate, effectiveEndDate);

  let dynamicInitBalances: Record<string, number> = {};
  if (balances.length === 0 || balances.every(b => (b.initialBalanceCents ?? 0) === 0)) {
    const pastSeasons = await repo.getPastSeasons(db, season.startDate);
    if (pastSeasons.length > 0) {
      const pastTransactions = await repo.getPastTransactions(db, season.startDate);
      const allBalances = await repo.getAllBalances(db);
      
      pastSeasons.sort((a, b) => a.startDate.localeCompare(b.startDate));
      const oldestSeason = pastSeasons[0];
      
      for (const accCode of accountTypes) {
        const accObj = dbAccounts.find(a => a.code === accCode);
        const accId = accObj ? accObj.id : accCode;
        
        // Find the earliest initial balance for this account across all past seasons
        let earliestBal = 0;
        let earliestDate = "1970-01-01";
        
        const pastSeasonsForAcc = pastSeasons.map(ps => {
          const balRow = allBalances.find(b => b.seasonId === ps.id && (b.accountId === accId || b.accountId === accCode));
          return { date: ps.startDate, bal: balRow ? (balRow.initialBalanceCents ?? 0) : 0 };
        }).filter(s => s.bal !== 0);
        
        if (pastSeasonsForAcc.length > 0) {
           pastSeasonsForAcc.sort((a, b) => a.date.localeCompare(b.date));
           earliestBal = pastSeasonsForAcc[0].bal;
           earliestDate = pastSeasonsForAcc[0].date;
        }
        
        let computedBal = earliestBal;
        
        for (const tx of pastTransactions) {
          if (tx.date < earliestDate) continue;
          
          const amount = tx.amountCents ?? 0;
          const isTargetAcc = tx.accountId === accId || tx.accountId === accCode;
          const isTargetDestAcc = tx.destinationAccountId === accId || tx.destinationAccountId === accCode;
          
          if (tx.type === 'recette' && isTargetAcc) computedBal += amount;
          else if (tx.type === 'depense' && isTargetAcc) computedBal -= amount;
          else if (tx.type === 'transfert') {
            if (isTargetAcc) computedBal -= amount;
            if (isTargetDestAcc) computedBal += amount;
          }
        }
        dynamicInitBalances[accCode] = computedBal;
      }
    }
  }

  const reportBalances = accountTypes.map(accCode => {
    const accObj = dbAccounts.find(a => a.code === accCode);
    const accId = accObj ? accObj.id : null;

    const initBalRow = balances.find(b => b.accountId === accId || b.accountId === accCode);
    let initBal = initBalRow ? (initBalRow.initialBalanceCents ?? 0) : 0;
    if (initBal === 0 && dynamicInitBalances[accCode] !== undefined) {
      initBal = dynamicInitBalances[accCode];
    }

    let finalBal = initBal;
    for (const tx of periodTxs) {
      const amount = tx.amountCents ?? 0;
      const isTargetAcc = (accId !== null && tx.accountId === accId) || tx.accountId === accCode;
      const isTargetDestAcc = (accId !== null && tx.destinationAccountId === accId) || tx.destinationAccountId === accCode;

      if (tx.type === 'recette' && isTargetAcc) {
        finalBal += amount;
      } else if (tx.type === 'depense' && isTargetAcc) {
        finalBal -= amount;
      } else if (tx.type === 'transfert') {
        if (isTargetAcc) finalBal -= amount;
        if (isTargetDestAcc) finalBal += amount;
      }
    }

    return {
      accountId: accCode,
      initialBalance: initBal,
      finalBalance: finalBal
    };
  });

  const totalGrossCashCents = reportBalances.reduce((sum, b) => sum + b.finalBalance, 0);

  // 3. Trésorerie Disponible & Repartition des Accruals (Deferred Revenues / Expenses)
  const deferredTxs = await repo.getDeferredTransactions(db, effectiveEndDate, season.id);

  const deferredRevenues: DeferredCashBreakdown[] = [];
  const deferredExpenses: DeferredCashBreakdown[] = [];
  let totalDeferredRevenueCents = 0;
  let totalDeferredExpensesCents = 0;

  for (const tx of deferredTxs) {
    const amount = tx.amountCents ?? 0;
    const catId = normalizeCategory(tx.categoryId ?? tx.category);
    const catObj = dbCategories.find(c => c.id === catId);
    const catName = catObj ? catObj.adminLabel : 'Non catégorisé';

    if (tx.accrualType === 'produit_constate_avance' && tx.type === 'recette') {
      totalDeferredRevenueCents += amount;
      deferredRevenues.push({
        categoryId: catId ?? 0,
        categoryName: catName,
        amountCents: amount
      });
    } else if (tx.accrualType === 'charge_constatee_avance' && tx.type === 'depense') {
      totalDeferredExpensesCents += amount;
      deferredExpenses.push({
        categoryId: catId ?? 0,
        categoryName: catName,
        amountCents: amount
      });
    }
  }

  let inVaultCents = 0;
  let pendingDebitCents = 0;
  for (const tx of periodTxs) {
    if (tx.status === 'in_vault' && tx.type === 'recette') {
      inVaultCents += (tx.amountCents ?? 0);
    } else if (tx.status === 'pending_debit' && tx.type === 'depense') {
      pendingDebitCents += (tx.amountCents ?? 0);
    }
  }

  // Trésorerie réellement disponible sur les relevés bancaires : 
  // on ajuste les chèques en coffre (non déposés) et les débits différés (CB).
  const netAvailableCashCents = totalGrossCashCents - inVaultCents + pendingDebitCents;

  const tresorerieDisponible = {
    totalGrossCashCents,
    inVaultCents,
    pendingDebitCents,
    totalDeferredRevenueCents,
    totalDeferredExpensesCents,
    netAvailableCashCents,
    deferredRevenues,
    deferredExpenses
  };

  // 4. Projections de Fin d'Exercice (Volet B - Only if arretedAu is provided)
  let projections: GetSeasonReportsOutput['projections'] = undefined;

  if (arretedAu) {
    const categoryBudgets = await repo.getCategoryBudgets(db, season.id);
    const projList: CategoryProjection[] = [];

    let totalProjectedRecettes = 0;
    let totalProjectedDepenses = 0;

    const pastSeasons = await repo.getPastSeasons(db, season.startDate);
    const pastTransactions = await repo.getPastTransactions(db, season.startDate);
    const dbCategories = await repo.getAllCategories(db);
    const virementInterneCatId = dbCategories.find((c: any) => c.adminLabel && c.adminLabel.startsWith('Virements Internes'))?.id;

    // Only use historical average if the ENTIRE season is unbudgeted
    const isSeasonCompletelyUnbudgeted = categoryBudgets.length === 0 || categoryBudgets.every(b => (b.amountCents ?? 0) === 0);

    const categoryHistoricalAverage: Record<string, number> = {};
    if (isSeasonCompletelyUnbudgeted && pastSeasons.length > 0) {
      const validPastSeasons = pastSeasons.filter(ps => {
        const txCount = pastTransactions.filter(tx => tx.seasonId === ps.id || tx.seasonId === Number(ps.id) || tx.seasonId === String(ps.id)).length;
        return txCount > 10;
      });

      if (validPastSeasons.length > 0) {
        const catTotalsPast: Record<string, number> = {};
        for (const tx of pastTransactions) {
          if (tx.categoryId !== null) {
            // Only count transactions belonging to valid past seasons
            const belongsToValidSeason = validPastSeasons.some(ps => tx.seasonId === ps.id || tx.seasonId === Number(ps.id) || tx.seasonId === String(ps.id));
            if (!belongsToValidSeason) continue;

            const catId = typeof tx.categoryId === 'object' ? (tx.categoryId as any).id : tx.categoryId;
            if (catId === virementInterneCatId) continue;
            const key = `${catId}_${tx.type}`;
            catTotalsPast[key] = (catTotalsPast[key] || 0) + (tx.amountCents ?? 0);
          }
        }
        for (const [key, total] of Object.entries(catTotalsPast)) {
           categoryHistoricalAverage[key] = Math.round(total / validPastSeasons.length);
        }
      }
    }

    const categoryTotals: Record<string, { total: number }> = {};
    const transactions = await repo.getTransactionsForSeason(db, season.id);
    for (const tx of transactions) {
      if (tx.categoryId !== null) {
        const catId = typeof tx.categoryId === 'object' ? (tx.categoryId as any).id : tx.categoryId;
        if (catId === virementInterneCatId) continue;
        const key = `${catId}_${tx.type}`;
        if (!categoryTotals[key]) {
          categoryTotals[key] = { total: 0 };
        }
        categoryTotals[key].total += tx.amountCents ?? 0;
      }
    }

    for (const cat of dbCategories) {
      for (const type of ['recette', 'depense'] as const) {
        const catKey = `${cat.id}_${type}`;
        
        let realisedCents = categoryTotals[catKey]?.total || 0;
        
        // Add deferred revenues/expenses (from previous season) to realisedCents
        // We look in pastTransactions (recorded before this season starts) for PCAs of this category
        if (type === 'recette') {
          const deferred = pastTransactions.filter(tx => {
            return tx.accrualType === 'produit_constate_avance' && normalizeCategory(tx.categoryId) === Number(cat.id) && tx.type === 'recette';
          }).reduce((sum, tx) => sum + (tx.amountCents || 0), 0);
          realisedCents += deferred;
        } else if (type === 'depense') {
          const deferred = pastTransactions.filter(tx => {
            return tx.accrualType === 'charge_constatee_avance' && normalizeCategory(tx.categoryId) === Number(cat.id) && tx.type === 'depense';
          }).reduce((sum, tx) => sum + (tx.amountCents || 0), 0);
          realisedCents += deferred;
        }

        const budgetRow = categoryBudgets.find(b => b.categoryId === cat.id && b.type === type);
        const budgetCents = budgetRow?.amountCents ?? 0;
        
        const historicalAvg = categoryHistoricalAverage[catKey] || 0;
        const effectiveBudget = budgetCents > 0 ? budgetCents : historicalAvg;

        const remainingBudgetCents = Math.max(0, effectiveBudget - realisedCents);
        const projectedCents = realisedCents + remainingBudgetCents;
        const isUnbudgeted = budgetCents === 0;

        if (realisedCents > 0 || budgetCents > 0 || historicalAvg > 0) {
          projList.push({
            categoryId: cat.id,
            categoryName: cat.adminLabel,
            type,
            realisedCents,
            budgetCents,
            remainingBudgetCents,
            projectedCents,
            isUnbudgeted
          });

          if (type === 'recette') {
            totalProjectedRecettes += projectedCents;
          } else {
            totalProjectedDepenses += projectedCents;
          }
        }
      }
    }

    const history: import('./forecast-engine').MonthlyHistory[] = [];
    const seasonStart = new Date(season.startDate);
    const effectiveDateObj = new Date(effectiveEndDate);
    const effectiveMonthIdxRaw = (effectiveDateObj.getFullYear() - seasonStart.getFullYear()) * 12 + (effectiveDateObj.getMonth() - seasonStart.getMonth());

    const currentAccId = dbAccounts.find(a => a.code === 'current')?.id || 'current';
    const savingsAccId = dbAccounts.find(a => a.code === 'savings')?.id || 'savings';
    
    const initCurrent = reportBalances.find(b => b.accountId === 'current')?.initialBalance ?? 0;
    const initSavings = reportBalances.find(b => b.accountId === 'savings')?.initialBalance ?? 0;

    const validEffectiveMonthIndex = Math.min(11, effectiveMonthIdxRaw);

    const toLocalISODate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    for (let m = 0; m <= validEffectiveMonthIndex; m++) {
      const monthStart = new Date(seasonStart.getFullYear(), seasonStart.getMonth() + m, 1);
      const monthStartStr = toLocalISODate(monthStart);
      const monthEnd = new Date(seasonStart.getFullYear(), seasonStart.getMonth() + m + 1, 0); // Last day of month
      const monthEndStr = toLocalISODate(monthEnd);
      
      let curBal = initCurrent;
      let savBal = initSavings;
      
      let monthRecettes = 0;
      let monthDepenses = 0;

      for (const tx of periodTxs) {
        if (tx.date > monthEndStr) continue;
        
        const isCur = tx.accountId === currentAccId || tx.accountId === 'current';
        const isSav = tx.accountId === savingsAccId || tx.accountId === 'savings';
        const isDestCur = tx.destinationAccountId === currentAccId || tx.destinationAccountId === 'current';
        const isDestSav = tx.destinationAccountId === savingsAccId || tx.destinationAccountId === 'savings';

        const amount = tx.amountCents ?? 0;
        
        const txCatId = typeof tx.categoryId === 'object' ? (tx.categoryId as any)?.id : tx.categoryId;
        
        if (tx.date >= monthStartStr && tx.date <= monthEndStr) {
          if (tx.seasonId === season.id || tx.seasonId === Number(season.id) || tx.seasonId === String(season.id)) {
            if (txCatId !== virementInterneCatId) {
              if (tx.type === 'recette') monthRecettes += amount;
              else if (tx.type === 'depense') monthDepenses += amount;
            }
          }
        }

        if (tx.type === 'recette') {
          if (isCur) curBal += amount;
          if (isSav) savBal += amount;
        } else if (tx.type === 'depense') {
          if (isCur) curBal -= amount;
          if (isSav) savBal -= amount;
        } else if (tx.type === 'transfert') {
          if (isCur) curBal -= amount;
          if (isSav) savBal -= amount;
          if (isDestCur) curBal += amount;
          if (isDestSav) savBal += amount;
        }
      }
      
      history.push({
        monthIndex: m,
        currentCents: curBal,
        savingsCents: savBal,
        realRecettesCents: monthRecettes,
        realDepensesCents: monthDepenses

      });
    }

    const treasuryForecast = generateTreasuryForecast(
      season,
      pastSeasons,
      pastTransactions,
      projList,
      history,
      effectiveEndDate,
      initCurrent,
      initSavings
    );

    projections = {
      categories: projList,
      totalProjectedRecettes,
      totalProjectedDepenses,
      projectedNetResult: totalProjectedRecettes - totalProjectedDepenses,
      treasuryForecast
    };
  }

  return {
    arretedAu: arretedAu || null,
    season: {
      id: season.id,
      code: season.code,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      closedAt: season.closedAt ? Number(season.closedAt) : null
    },
    compteResultat: {
      totalRecettes,
      totalDepenses,
      netResult: totalRecettes - totalDepenses,
      categories: categoryTotals
    },
    bilanTrésorerie: reportBalances,
    tresorerieDisponible,
    projections
  };
}
