import { type Db, AppError } from '@nba/db';
import { normalizeCategory } from '../../shared/helpers';
import { affectsProfitAndLoss, resolveLegacyTransferCategoryId } from '../../shared/entry-classification';
import { GetSeasonReportsRepository } from './repository';
import { GetSeasonReportsInput, GetSeasonReportsOutput, CategoryProjection, DeferredCashBreakdown } from "./dto";
import { getSeasonFromDb } from '../../shared/accruals';
import { generateTreasuryForecast } from './forecast-engine';
import { computeAccountBalance, computeAccountBalances, sumAccountBalances, type AccountRef, signedEntryAmountCents } from '../../shared/balances';
import { resolveOpeningBalances } from '../../shared/opening-balances';

export async function getSeasonReports(db: Db, input: GetSeasonReportsInput): Promise<GetSeasonReportsOutput> {
  const seasonId = typeof input === 'string' ? input : input.seasonId;
  const arretedAu = typeof input === 'string' ? undefined : input.arretedAu;

  const repo = new GetSeasonReportsRepository();
  const season = await getSeasonFromDb(db, seasonId);
  if (!season) {
    throw new AppError("Saison introuvable.", 404);
  }

  // Date d'arrêté = simple date « as-of ». Aucune borne : avant le début de saison →
  // rien de réalisé (période vide) ; après le 31/08 (clôture ~mi-octobre) → capte les
  // prélèvements/chèques tardifs rattachés à l'exercice (compta de trésorerie). C'est ce
  // qui permet aussi d'afficher le bilan d'une saison future (arrêté = aujourd'hui).
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

  const virementInterneCatId = resolveLegacyTransferCategoryId(dbCategories as any);

  for (const tx of allTxs) {
    /*
     * Une seule question posée, au même endroit que partout ailleurs : cette écriture pèse-t-elle
     * sur le résultat ? La règle tenait ici en deux tests distincts — le type, puis la catégorie
     * héritée — recopiés à six endroits, dont deux n'en appliquaient qu'un.
     */
    if (!affectsProfitAndLoss(tx, virementInterneCatId)) continue;
    // Exclude transactions dated after cut-off date
    if (tx.date > effectiveEndDate) continue;

    const amount = tx.amountCents ?? 0;
    const catId = normalizeCategory(tx.categoryId ?? tx.category);

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

  /*
   * Les comptes du bilan de trésorerie, lus de la base quand elle en porte, repliés sur les
   * trois codes historiques sinon. Repartir de `accounts` fait entrer dans le rapport un
   * compte ajouté depuis l'écran de configuration, que la liste en dur laissait de côté ;
   * le repli garde un tableau à trois lignes là où la base n'a pas encore été semée.
   */
  const treasuryAccounts: AccountRef[] = dbAccounts.length > 0
    ? dbAccounts.map((a: any) => ({ id: a.id, code: a.code, label: a.label }))
    : accountTypes.map((code) => ({ id: code as any, code }));

  /*
   * Le solde d'ouverture de chaque compte : le report figé s'il existe, la reconstitution
   * sinon. La règle vit désormais dans `shared/opening-balances.ts`, partagée avec le
   * rapprochement et le grand livre.
   *
   * Ce que faisait le code d'ici tenait la bonne idée mais l'avait pour lui seul, si bien que
   * le rapprochement affichait un écart pendant que ce bilan-ci donnait le bon chiffre. Il
   * repartait aussi du PLUS ANCIEN report non nul en resommant tout depuis, et chargeait pour
   * cela le grand livre entier dans le Worker — le résolveur repart du plus récent point figé
   * et fait la somme en base. Sur le plan gratuit, la ressource rare est le nombre de lignes
   * lues en D1.
   *
   * Le repli sur les trois codes historiques (base non semée, jamais en production) n'a pas
   * d'identifiants numériques : il se contente alors du report tel quel, comme avant.
   */
  const idsNumeriques = treasuryAccounts.every((a) => typeof a.id === 'number');
  const ouverture = idsNumeriques
    ? await resolveOpeningBalances(
        db,
        { id: season.id, startDate: season.startDate },
        treasuryAccounts.map((a) => a.id as number)
      )
    : null;

  const accountBalances = computeAccountBalances(
    treasuryAccounts,
    treasuryAccounts.map((account) => ({
      accountId: account.id,
      initialBalanceCents: ouverture
        ? ouverture.byAccountId.get(account.id as number) ?? 0
        : balances.find((b) => b.accountId === account.id || b.accountId === account.code)?.initialBalanceCents ?? 0
    })),
    periodTxs
  );

  /*
   * Le solde du relevé accompagne désormais chaque compte.
   *
   * Les écrans affichaient jusqu'ici un solde bancaire *calculé* (comptable moins les chèques
   * en coffre) sous le libellé « en banque ». Le libellé promettait une confirmation de la
   * banque que le nombre ne livrait pas : une recette saisie par virement naît `cleared` et le
   * déplaçait, alors que rien ne prouvait que l'argent fût arrivé. Le solde du relevé, lui, ne
   * bouge sur aucune saisie — c'est exactement la propriété qu'on cherchait à montrer.
   */
  const statementBalances = await repo.getLatestStatementBalances(db, effectiveEndDate);

  const reportBalances = accountBalances.map((b) => {
    const statement = statementBalances.get(b.accountId);
    return {
      accountId: b.accountCode,
      /** Identifiant numérique et libellé, lus de `accounts` : les écrans n'ont plus de table à eux. */
      id: typeof b.accountId === 'number' ? b.accountId : undefined,
      label: b.accountLabel ?? b.accountCode,
      initialBalance: b.initialBalanceCents,
      /** Solde COMPTABLE de fin de période : à-nouveau + écritures, sans correction. */
      finalBalance: b.grossCents,
      inVaultCents: b.inVaultCents,
      pendingDebitCents: b.pendingDebitCents,
      /** Ce que le relevé de ce compte devrait afficher, déduit des seuls statuts. */
      bankTheoreticalCents: b.bankTheoreticalCents,
      /** Ce que le relevé affiche vraiment. `null` tant qu'aucun n'a été importé. */
      statementBalanceCents: statement ? statement.balanceCents : null,
      statementDate: statement ? statement.date : null
    };
  });

  const cashTotals = sumAccountBalances(accountBalances);
  const totalGrossCashCents = cashTotals.grossCents;

  // 3. Trésorerie Disponible & Repartition des Accruals (Deferred Revenues / Expenses)
  const deferredTxs = await repo.getDeferredTransactions(db, season.startDate, effectiveEndDate);

  /*
   * Regroupé par catégorie, et non ligne à ligne.
   *
   * Une rentrée de cotisations encaissées d'avance compte cinquante écritures : les
   * dérouler donnait cinquante fois le même libellé, et un total à faire de tête dans un
   * encart dont c'est justement le seul intérêt. Le détail se lit au grand livre.
   */
  const revenuesByCategory = new Map<number, DeferredCashBreakdown>();
  const expensesByCategory = new Map<number, DeferredCashBreakdown>();
  let totalDeferredRevenueCents = 0;
  let totalDeferredExpensesCents = 0;

  const accumulate = (into: Map<number, DeferredCashBreakdown>, catId: number, catName: string, amount: number) => {
    const known = into.get(catId);
    if (known) {
      known.amountCents += amount;
      known.count += 1;
    } else {
      into.set(catId, { categoryId: catId, categoryName: catName, amountCents: amount, count: 1 });
    }
  };

  for (const tx of deferredTxs) {
    const amount = tx.amountCents ?? 0;
    const catId = normalizeCategory(tx.categoryId ?? tx.category) ?? 0;
    const catObj = dbCategories.find(c => c.id === catId);
    const catName = catObj ? catObj.adminLabel : 'Non catégorisé';

    if (tx.accrualType === 'produit_constate_avance' && tx.type === 'recette') {
      totalDeferredRevenueCents += amount;
      accumulate(revenuesByCategory, catId, catName, amount);
    } else if (tx.accrualType === 'charge_constatee_avance' && tx.type === 'depense') {
      totalDeferredExpensesCents += amount;
      accumulate(expensesByCategory, catId, catName, amount);
    }
  }

  // Du plus lourd au plus léger : c'est l'ordre dans lequel on lit une régularisation.
  const byAmount = (a: DeferredCashBreakdown, b: DeferredCashBreakdown) => b.amountCents - a.amountCents;
  const deferredRevenues: DeferredCashBreakdown[] = [...revenuesByCategory.values()].sort(byAmount);
  const deferredExpenses: DeferredCashBreakdown[] = [...expensesByCategory.values()].sort(byAmount);

  // Trésorerie réellement disponible sur les relevés bancaires :
  // on ajuste les chèques en coffre (non déposés) et les débits différés (CB).
  const { inVaultCents, pendingDebitCents, bankTheoreticalCents: netAvailableCashCents } = cashTotals;

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

  // 4. Projections de Fin d'Exercice (Volet B) — uniquement pour un arrêté EN COURS
  // d'exercice (≤ fin de saison). Après la fin (clôture), l'exercice est terminé : pas
  // de projection de fin d'exercice.
  let projections: GetSeasonReportsOutput['projections'] = undefined;

  if (arretedAu && arretedAu <= season.endDate) {
    const categoryBudgets = await repo.getCategoryBudgets(db, season.id);
    const projList: CategoryProjection[] = [];

    let totalProjectedRecettes = 0;
    let totalProjectedDepenses = 0;

    const pastSeasons = await repo.getPastSeasons(db, season.startDate);
    const pastTransactions = await repo.getPastTransactions(db, season.startDate);
    const dbCategories = await repo.getAllCategories(db);
    const virementInterneCatId = resolveLegacyTransferCategoryId(dbCategories as any);

    // Always compute historical average so unbudgeted categories fallback to it
    const categoryHistoricalAverage: Record<string, number> = {};
    let validPastSeasons: any[] = [];
    if (pastSeasons.length > 0) {
      validPastSeasons = pastSeasons.filter(ps => {
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

            if (!affectsProfitAndLoss(tx, virementInterneCatId)) continue;
            const catId = typeof tx.categoryId === 'object' ? (tx.categoryId as any).id : tx.categoryId;
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
    // Réalisé = transactions de CETTE saison encaissées jusqu'à la date d'arrêté :
    //  - filtre par saison → exclut les produits/charges constatés d'avance d'une AUTRE saison
    //    (ceux-ci sont réintégrés séparément plus bas via les PCA/CCA des saisons passées) ;
    //  - filtre par date → applique le cut-off d'arrêté (une recette encaissée après n'est
    //    pas « réalisée » à date, elle relève du reste-à-réaliser).
    const seasonTxs = await repo.getTransactionsForSeason(db, season.id);
    const transactions = seasonTxs.filter((tx: any) => tx.date <= effectiveEndDate);
    for (const tx of transactions) {
      if (tx.categoryId !== null) {
        if (!affectsProfitAndLoss(tx, virementInterneCatId)) continue;
        const catId = typeof tx.categoryId === 'object' ? (tx.categoryId as any).id : tx.categoryId;
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

    /*
     * Les comptes de la courbe de trésorerie, résolus en base plutôt que nommés en dur.
     *
     * La boucle qui suit recodait à la main la ventilation d'un virement, avec `'current'` et
     * `'savings'` écrits en toutes lettres : la **caisse n'y figurait pas**. Un dépôt d'espèces —
     * le seul virement que le centre d'aide recommande explicitement — sortait donc de la courbe
     * comme une fuite de trésorerie. Le total suit désormais les trois comptes ; les deux séries
     * nommées restent celles que le graphe affiche.
     */
    const currentAccount = dbAccounts.find(a => a.code === 'current');
    const savingsAccount = dbAccounts.find(a => a.code === 'savings');
    const cashAccount = dbAccounts.find(a => a.code === 'cash');

    const initCurrent = reportBalances.find(b => b.accountId === 'current')?.initialBalance ?? 0;
    const initSavings = reportBalances.find(b => b.accountId === 'savings')?.initialBalance ?? 0;
    const initCash = reportBalances.find(b => b.accountId === 'cash')?.initialBalance ?? 0;

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
      let cashBal = initCash;

      let monthRecettes = 0;
      let monthDepenses = 0;

      for (const tx of periodTxs) {
        if (tx.date > monthEndStr) continue;

        const amount = tx.amountCents ?? 0;

        if (tx.date >= monthStartStr && tx.date <= monthEndStr) {
          if (tx.seasonId === season.id || tx.seasonId === Number(season.id) || tx.seasonId === String(season.id)) {
            if (affectsProfitAndLoss(tx, virementInterneCatId)) {
              if (tx.type === 'recette') monthRecettes += amount;
              else if (tx.type === 'depense') monthDepenses += amount;
            }
          }
        }

        /*
         * Le même calcul de signe que partout ailleurs, plutôt qu'une troisième réécriture.
         * Une jambe de virement ne touche que son compte : il n'y a plus de destinataire à
         * démêler, et plus de compte à oublier.
         */
        if (currentAccount) curBal += signedEntryAmountCents(tx, currentAccount);
        if (savingsAccount) savBal += signedEntryAmountCents(tx, savingsAccount);
        if (cashAccount) cashBal += signedEntryAmountCents(tx, cashAccount);
      }
      
      history.push({
        monthIndex: m,
        currentCents: curBal,
        savingsCents: savBal,
        cashCents: cashBal,
        realRecettesCents: monthRecettes,
        realDepensesCents: monthDepenses

      });
    }

    const treasuryForecast = generateTreasuryForecast(
      season,
      validPastSeasons.length > 0 ? validPastSeasons : pastSeasons,
      pastTransactions,
      periodTxs, // Pass current cash transactions
      projList,
      history,
      effectiveEndDate,
      initCurrent,
      initSavings,
      virementInterneCatId
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
