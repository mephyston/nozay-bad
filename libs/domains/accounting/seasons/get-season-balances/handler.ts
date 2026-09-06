import { type Db } from '@nba/db';
import { GetSeasonBalancesRepository } from './repository';
import { GetSeasonBalancesInput, GetSeasonBalancesOutput } from './dto';

export async function getSeasonBalances(db: Db, seasonId: GetSeasonBalancesInput): Promise<GetSeasonBalancesOutput> {
  const repo = new GetSeasonBalancesRepository();
  const rows = await repo.getBalances(db, seasonId);

  return rows.map((b) => ({
    seasonId: b.seasonId,
    accountId: b.accountCode,
    accountNumericId: b.accountId,
    label: b.accountLabel,
    initialBalanceCents: b.initialBalanceCents,
    initialBalance: b.initialBalanceCents
  }));
}
