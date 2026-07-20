import { ListInvoicesRepository } from './repository';
import { ListInvoicesInput, ListInvoicesOutput } from "./dto";

export async function listInvoices(db: any, seasonId: ListInvoicesInput): Promise<ListInvoicesOutput> {
  const repo = new ListInvoicesRepository();
  return repo.list(db, seasonId);
}
