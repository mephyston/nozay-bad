import { type DbOrTx } from '@nba/db';
import { listAccounts, type AccountSummary } from '../queries';

export class ListAccountsRepository {
  async listAccounts(db: DbOrTx): Promise<AccountSummary[]> {
    return listAccounts(db);
  }
}
