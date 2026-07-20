import { SeasonsRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { AppError } from '@metacult/shared-db';
import { SeasonClosedError } from '../shared/errors';
import { normalizeCategory } from '@metacult/features-accounting-data-access';

export async function listSeasons(db: any) {
  const repo = new SeasonsRepository();
  return repo.listSeasons(db);
}

export async function createSeason(db: any, body: { id: string; name: string; active?: boolean }) {
  const repo = new SeasonsRepository();
  if (body.active) {
    await repo.deactivateAllSeasonsExcept(db);
  }
  return repo.createSeason(db, {
    id: body.id,
    name: body.name,
    active: body.active || false,
    createdAt: new Date()
  });
}

export async function updateSeason(db: any, id: string, body: { name?: string; active?: boolean; closed?: boolean }) {
  const repo = new SeasonsRepository();
  if (body.active) {
    await repo.deactivateAllSeasonsExcept(db, id);
  }
  const updated = await repo.updateSeason(db, id, body);
  if (!updated) {
    throw new AppError('Saison introuvable', 404);
  }
  return updated;
}

export async function closeSeason(db: any, id: string) {
  const repo = new SeasonsRepository();
  const updated = await repo.updateSeason(db, id, { closed: true });
  if (!updated) {
    throw new AppError('Saison introuvable', 404);
  }
  return updated;
}

export async function getSeasonBudget(db: any, seasonId: string) {
  const repo = new SeasonsRepository();
  return repo.getBudget(db, seasonId);
}

export async function updateSeasonBudget(db: any, seasonId: string, body: { categoryId: number; type: 'recette' | 'depense'; amount: number }[]) {
  if (await isSeasonClosed(db, seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de modifier son prévisionnel.');
  }
  const repo = new SeasonsRepository();
  return repo.updateBudget(db, seasonId, body);
}

export async function getSeasonBalance(db: any, seasonId: string) {
  const repo = new SeasonsRepository();
  const [yy, zz] = seasonId.split('-');
  if (!yy || !zz || yy.length !== 2 || zz.length !== 2) {
    throw new AppError('Format de saison invalide. Format attendu : YY-ZZ (ex: 25-26)', 400);
  }

  const startYear = 2000 + parseInt(yy);
  const endYear = 2000 + parseInt(zz);
  const startDateStr = `${startYear}-09-01`;
  const endDateStr = `${endYear}-08-31`;

  const balances = await repo.getBalances(db, seasonId);
  const cashFlowTxs = await repo.getTransactionsForPeriod(db, startDateStr, endDateStr);

  const accounts = ['current', 'savings', 'cash'] as const;
  let totalBalance = 0;

  for (const acc of accounts) {
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
    totalBalance += finalBal;
  }

  return { balance: totalBalance };
}

export async function getSeasonBalances(db: any, seasonId: string) {
  const repo = new SeasonsRepository();
  return repo.getBalances(db, seasonId);
}

export async function updateSeasonBalances(db: any, seasonId: string, body: { accountId: 'current' | 'savings' | 'cash'; initialBalance: number }[]) {
  if (await isSeasonClosed(db, seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de modifier ses soldes initiaux.');
  }
  const repo = new SeasonsRepository();
  await repo.updateBalances(db, seasonId, body);
}

export async function getSeasonReports(db: any, seasonId: string) {
  const repo = new SeasonsRepository();
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
