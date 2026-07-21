import { DeleteInvoiceRepository } from './repository';
import { Invoice } from '../../shared/invoice';
import { InvoiceNotFoundError, InvoiceNotDeletableError, SeasonClosedError } from '../../shared/errors';
import { isSeasonClosed } from '@metacult/features-members-api';
import { DeleteInvoiceInput, DeleteInvoiceOutput } from "./dto";

export async function deleteInvoice(db: any, id: DeleteInvoiceInput): Promise<DeleteInvoiceOutput> {
  return db.transaction(async (txDb: any) => {
    const repo = new DeleteInvoiceRepository();
    const invoiceData = await repo.getById(txDb, id);
    if (!invoiceData) {
      throw new InvoiceNotFoundError();
    }

    const closed = await isSeasonClosed(txDb, invoiceData.seasonId);
    const invoice = new Invoice(invoiceData);
    if (!invoice.canBeDeleted(closed)) {
      if (closed) throw new SeasonClosedError('Saison clôturée');
      throw new InvoiceNotDeletableError();
    }

    await repo.delete(txDb, id);
  });
}
