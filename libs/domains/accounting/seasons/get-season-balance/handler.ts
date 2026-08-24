import { AppError, type Db } from '@nba/db';
import { GetSeasonBalanceRepository } from './repository';
import { GetSeasonBalanceInput, GetSeasonBalanceOutput } from "./dto";
import { computeAccountBalances, sumAccountBalances } from '../../shared/balances';

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
  const accounts = await repo.getTreasuryAccounts(db);

  const perAccount = computeAccountBalances(accounts, balances, cashFlowTxs);
  const totals = sumAccountBalances(perAccount);

  /*
   * `balance` reste le solde COMPTABLE, et garde son nom : c'est ce que le tableau de bord
   * affiche depuis toujours. Les trois autres nombres l'accompagnent désormais, pour que
   * l'appelant puisse dire lequel des soldes il montre au lieu d'avoir à le deviner.
   */
  return {
    balance: totals.grossCents,
    grossCents: totals.grossCents,
    inVaultCents: totals.inVaultCents,
    pendingDebitCents: totals.pendingDebitCents,
    bankTheoreticalCents: totals.bankTheoreticalCents,
    accounts: perAccount
  };
}
