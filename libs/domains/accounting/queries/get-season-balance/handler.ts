import { AppError } from '@metacult/shared-db';
import { GetSeasonBalanceRepository } from './repository';

export async function getSeasonBalance(db: any, seasonId: string) {
  const repo = new GetSeasonBalanceRepository();
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
