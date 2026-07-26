import { type Db, AppError } from '@nba/db';
import { normalizeCategory } from '../../shared/helpers';
import { GetSeasonReportsRepository } from './repository';
import { GetSeasonReportsInput, GetSeasonReportsOutput, CategoryProjection, DeferredCashBreakdown } from "./dto";
import { getSeasonFromDb } from '../../shared/accruals';

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
    if (arretedAu < season.startDate || arretedAu > season.endDate) {
      throw new AppError("La date d'arrêté doit être comprise entre le début (start_date) et la fin (end_date) de l'exercice.", 400);
    }
    effectiveEndDate = arretedAu;
  }

  const balances = await repo.getBalances(db, season.id);
  const allTxs = await repo.getTransactionsForSeason(db, season.id);
  const dbCategories = await repo.getAllCategories(db);

  // 1. Compte de Résultat (Income Statement)
  const categoryTotals: Record<string, { type: 'recette' | 'depense', total: number }> = {};
  let totalRecettes = 0;
  let totalDepenses = 0;

  for (const tx of allTxs) {
    if (tx.type === 'transfert') continue;
    // Exclude transactions dated after cut-off date
    if (tx.date > effectiveEndDate) continue;

    const amount = tx.amountCents ?? 0;
    const catId = normalizeCategory(tx.categoryId ?? tx.category);
    const cat = catId !== null ? catId.toString() : 'divers';
    const key = `${cat}_${tx.type}`;

    if (!categoryTotals[key]) {
      categoryTotals[key] = { type: tx.type, total: 0 };
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

  const reportBalances = accountTypes.map(accCode => {
    const accObj = dbAccounts.find(a => a.code === accCode);
    const accId = accObj ? accObj.id : null;

    const initBalRow = balances.find(b => b.accountId === accId || b.accountId === accCode);
    const initBal = initBalRow ? (initBalRow.initialBalanceCents ?? 0) : 0;

    let finalBal = initBal;
    for (const tx of allTxs) {
      if (tx.date > effectiveEndDate || tx.date < season.startDate) continue;
      
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
  const deferredTxs = await repo.getDeferredTransactions(db, effectiveEndDate);

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

  const netAvailableCashCents = totalGrossCashCents - totalDeferredRevenueCents + totalDeferredExpensesCents;

  const tresorerieDisponible = {
    totalGrossCashCents,
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

    for (const cat of dbCategories) {
      for (const type of ['recette', 'depense'] as const) {
        const catKey = `${cat.id}_${type}`;
        const realisedCents = categoryTotals[catKey]?.total || 0;

        const budgetRow = categoryBudgets.find(b => b.categoryId === cat.id && b.type === type);
        const budgetCents = budgetRow?.amountCents ?? 0;

        const remainingBudgetCents = Math.max(0, budgetCents - realisedCents);
        const projectedCents = realisedCents + remainingBudgetCents;
        const isUnbudgeted = budgetCents === 0;

        if (realisedCents > 0 || budgetCents > 0) {
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

    projections = {
      categories: projList,
      totalProjectedRecettes,
      totalProjectedDepenses,
      projectedNetResult: totalProjectedRecettes - totalProjectedDepenses
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
