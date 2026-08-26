import { type Db } from '@nba/db';
import { ListInvoicesRepository } from './repository';
import { ListInvoicesInput, ListInvoicesOutput } from "./dto";

export async function listInvoices(db: Db, seasonId: ListInvoicesInput): Promise<ListInvoicesOutput> {
  const repo = new ListInvoicesRepository();
  const invoices = await repo.list(db, seasonId);

  // Chaque facture porte l'imputation de ce qu'elle encaissera : c'est ce qui remplace le
  // `category: '1'` que le rapprochement posait en dur.
  const breakdown = await repo.listCategoryBreakdown(db, invoices.map((inv) => inv.id));
  return invoices.map((inv) => ({ ...inv, categoryBreakdown: breakdown.get(inv.id) ?? [] }));
}
