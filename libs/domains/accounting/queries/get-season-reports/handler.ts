import { type Db } from '@nba/db';
import { normalizeCategory } from '@nba/accounting-api';
import { GetSeasonReportsRepository } from './repository';
import { GetSeasonReportsInput, GetSeasonReportsOutput } from "./dto";

export async function getSeasonReports(db: Db, seasonId: GetSeasonReportsInput): Promise<GetSeasonReportsOutput> {
  const repo = new GetSeasonReportsRepository();
  const [yy, zz] = seasonId.split('-');
  const startYear = 2000 + parseInt(yy);
  const endYear = 2000 + parseInt(zz);
  const startDateStr = `${startYear}-09-01`;
  const endDateStr = `${endYear}-08-31`;

  const balances = await repo.getBalances(db, seasonId);
  const allTxs = await repo.getTransactionsForSeason(db, seasonId);
  const cashFlowTxs = await repo.getTransactionsForPeriod(db, startDateStr, endDateStr);

  const categoryTotals: Record<string, { type: 'recette' | 'depense', total: number }> = {};
  let totalRecettes = 0;
  let totalDepenses = 0;

  const transitCat = await repo.getTransitCategory(db);
  const transitCatId = transitCat ? transitCat.id : null;

  for (const tx of allTxs) {
    if (tx.type === 'transfert') continue;

    const cat = normalizeCategory(tx.category)?.toString() || 'divers';
    const key = `${cat}_${tx.type}`;
    if (!categoryTotals[key]) {
      categoryTotals[key] = { type: tx.type, total: 0 };
    }
    categoryTotals[key].total += tx.amount;

    if (normalizeCategory(tx.category) !== transitCatId) {
      if (tx.type === 'recette') {
        totalRecettes += tx.amount;
      } else {
        totalDepenses += tx.amount;
      }
    }
  }

  const accounts = ['current', 'savings', 'cash'] as const;
  const reportBalances = accounts.map(acc => {
    const initBal = balances.find(b => b.accountId === acc)?.initialBalance || 0;

    let finalBal = initBal;
    for (const tx of cashFlowTxs) {
      if (tx.type === 'recette' && tx.accountId === acc) {
        finalBal += tx.amount;
      } else if (tx.type === 'depense' && tx.accountId === acc) {
        finalBal -= tx.amount;
      } else if (tx.type === 'transfert') {
        if (tx.accountId === acc) finalBal -= tx.amount;
        if (tx.destinationAccountId === acc) finalBal += tx.amount;
      }
    }

    return {
      accountId: acc,
      initialBalance: initBal,
      finalBalance: finalBal
    };
  });

  return {
    compteResultat: {
      totalRecettes,
      totalDepenses,
      netResult: totalRecettes - totalDepenses,
      categories: categoryTotals
    },
    bilanTrésorerie: reportBalances
  };
}
