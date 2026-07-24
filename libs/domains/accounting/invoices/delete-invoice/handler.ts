import { type Db, type Tx } from '@nba/db';
import { DeleteInvoiceRepository } from './repository';
import { Invoice } from '../../shared/invoice';
import { InvoiceNotFoundError, InvoiceNotDeletableError, SeasonClosedError } from '../../shared/errors';
import { isSeasonClosed } from '@nba/members-api';
import { DeleteInvoiceInput, DeleteInvoiceOutput } from "./dto";

export async function deleteInvoice(db: Db, id: DeleteInvoiceInput): Promise<DeleteInvoiceOutput> {
  const repo = new DeleteInvoiceRepository();
  const invoiceData = await repo.getById(db, id);
  if (!invoiceData) {
    throw new InvoiceNotFoundError();
  }

  const closed = await isSeasonClosed(db, invoiceData.seasonId);
  const invoice = new Invoice(invoiceData);
  if (!invoice.canBeDeleted(closed)) {
    if (closed) throw new SeasonClosedError('Saison clôturée');
    throw new InvoiceNotDeletableError();
  }

  await repo.delete(db, id);
}
