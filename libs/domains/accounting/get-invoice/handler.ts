import { GetInvoiceRepository } from './repository';
import { InvoiceNotFoundError } from '../shared/errors';

export async function getInvoice(db: any, id: number) {
  const repo = new GetInvoiceRepository();
  const invoice = await repo.getById(db, id);
  if (!invoice) {
    throw new InvoiceNotFoundError();
  }
  const items = await repo.getItemsByInvoiceId(db, id);
  return { ...invoice, items };
}
