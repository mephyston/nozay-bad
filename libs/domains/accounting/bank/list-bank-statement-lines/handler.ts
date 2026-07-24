import { type Db } from '@nba/db';
import { ListBankStatementLinesRepository } from './repository';
import type { ListBankStatementLinesInput, ListBankStatementLinesOutput } from './dto';

export async function listBankStatementLines(db: Db, input: ListBankStatementLinesInput): Promise<ListBankStatementLinesOutput> {
  const repo = new ListBankStatementLinesRepository();
  return repo.listBankStatementLines(db, input.seasonId, input as any);
}
