import { type Db } from '@metacult/shared-db';
import { ListChecksRepository } from './repository';
import type { ListChecksOutput, ListCheckDepositsOutput } from './dto';

export async function listChecks(db: Db, seasonId: string, status?: string): Promise<ListChecksOutput[]> {
  const repo = new ListChecksRepository();
  return repo.listChecks(db, seasonId, status);
}

export async function listCheckDeposits(db: Db, seasonId: string): Promise<ListCheckDepositsOutput[]> {
  const repo = new ListChecksRepository();
  return repo.listCheckDeposits(db, seasonId);
}
