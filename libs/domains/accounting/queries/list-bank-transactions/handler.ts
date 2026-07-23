import { type Db } from '@metacult/shared-db';
import { ListBankTransactionsRepository } from './repository';
import type { ListBankTransactionsInput, ListBankTransactionsOutput } from './dto';

export async function listBankTransactions(db: Db, input: ListBankTransactionsInput): Promise<ListBankTransactionsOutput> {
  const repo = new ListBankTransactionsRepository();
  return repo.listBankTransactions(db, input.seasonId, input.filters || {});
}
