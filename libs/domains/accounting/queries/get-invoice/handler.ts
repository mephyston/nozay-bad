import { type Db } from '@metacult/shared-db';
import { GetInvoiceRepository } from './repository';
import { InvoiceNotFoundError } from '../../shared/errors';
import { GetInvoiceInput, GetInvoiceOutput } from "./dto";

export async function getInvoice(db: Db, id: GetInvoiceInput): Promise<GetInvoiceOutput> {
  const repo = new GetInvoiceRepository();
  const invoice = await repo.getById(db, id);
  if (!invoice) {
    throw new InvoiceNotFoundError();
  }
  const items = await repo.getItemsByInvoiceId(db, id);
  return { ...invoice, items };
}
