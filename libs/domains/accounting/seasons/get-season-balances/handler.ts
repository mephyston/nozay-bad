import { type Db } from '@nba/db';
import { GetSeasonBalancesRepository } from './repository';
import { GetSeasonBalancesInput, GetSeasonBalancesOutput } from "./dto";

export async function getSeasonBalances(db: Db, seasonId: GetSeasonBalancesInput): Promise<GetSeasonBalancesOutput> {
  const repo = new GetSeasonBalancesRepository();
  const rawBalances = await repo.getBalances(db, seasonId);

  const accMap: Record<number, 'current' | 'savings' | 'cash'> = { 1: 'current', 2: 'savings', 3: 'cash' };

  return rawBalances.map(b => {
    const accCode = typeof b.accountId === 'number' ? accMap[b.accountId] || b.accountId : b.accountId;
    const cents = b.initialBalanceCents ?? (b as any).initialBalance ?? 0;
    return {
      ...b,
      accountId: accCode as any,
      initialBalance: cents,
      initialBalanceCents: cents
    };
  }) as any;
}
