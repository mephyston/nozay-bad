import { AppError, type Db } from '@nba/db';
import { GetSeasonBalanceRepository } from './repository';
import { GetSeasonBalanceInput, GetSeasonBalanceOutput } from "./dto";

export async function getSeasonBalance(db: Db, seasonId: GetSeasonBalanceInput): Promise<GetSeasonBalanceOutput> {
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
  const accountIdMap: Record<string, number> = { current: 1, savings: 2, cash: 3 };
  let totalBalance = 0;

  for (const acc of accounts) {
    const numericAccId = accountIdMap[acc];
    const initBalRow = balances.find(b => b.accountId === acc || b.accountId === numericAccId);
    const initBal = initBalRow ? (initBalRow.initialBalanceCents ?? initBalRow.initialBalance ?? 0) : 0;
    let finalBal = initBal;
    for (const tx of cashFlowTxs) {
      const txAmount = tx.amountCents ?? (tx.amount ? tx.amount * 100 : 0);
      const isTargetAcc = tx.accountId === acc || tx.accountId === numericAccId;
      const isDestAcc = tx.destinationAccountId === acc || tx.destinationAccountId === numericAccId;

      if (tx.type === 'recette' && isTargetAcc) {
        finalBal += txAmount;
      } else if (tx.type === 'depense' && isTargetAcc) {
        finalBal -= txAmount;
      } else if (tx.type === 'transfert') {
        if (isTargetAcc) finalBal -= txAmount;
        if (isDestAcc) finalBal += txAmount;
      }
    }
    totalBalance += finalBal;
  }

  return { balance: totalBalance };
}
