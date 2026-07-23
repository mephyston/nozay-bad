import { type Db } from '@nba/db';
import { ListInvoicesRepository } from './repository';
import { ListInvoicesInput, ListInvoicesOutput } from "./dto";

export async function listInvoices(db: Db, seasonId: ListInvoicesInput): Promise<ListInvoicesOutput> {
  const repo = new ListInvoicesRepository();
  return repo.list(db, seasonId);
}
