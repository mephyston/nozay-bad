import { ListInvoicesRepository } from './repository';

export async function listInvoices(db: any, seasonId: string) {
  const repo = new ListInvoicesRepository();
  return repo.list(db, seasonId);
}
