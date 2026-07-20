import { ListChecksRepository } from './repository';
import type { ListChecksOutput, ListCheckDepositsOutput } from './dto';

export async function listChecks(db: any, seasonId: string, status?: string): Promise<ListChecksOutput[]> {
  const repo = new ListChecksRepository();
  return repo.listChecks(db, seasonId, status);
}

export async function listCheckDeposits(db: any, seasonId: string): Promise<ListCheckDepositsOutput[]> {
  const repo = new ListChecksRepository();
  return repo.listCheckDeposits(db, seasonId);
}
