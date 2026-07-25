import { type Db } from '@nba/db';
import { ListChecksRepository } from './repository';
import type { ListChecksOutput, ListCheckDepositsOutput } from './dto';

export async function listChecks(db: Db, seasonId: string, status?: string): Promise<ListChecksOutput[]> {
  const repo = new ListChecksRepository();
  const checks = await repo.listChecks(db, seasonId, status);
  return checks.map(c => {
    const cents = (c as any).amountCents ?? c.amount ?? 0;
    return {
      ...c,
      amount: cents,
      amountCents: cents
    };
  }) as any;
}

export async function listCheckDeposits(db: Db, seasonId: string): Promise<ListCheckDepositsOutput[]> {
  const repo = new ListChecksRepository();
  const deposits = await repo.listCheckDeposits(db, seasonId);
  return deposits.map(d => {
    const cents = (d as any).amountCents ?? (d as any).amount ?? 0;
    return {
      ...d,
      amount: cents,
      amountCents: cents
    };
  }) as any;
}
