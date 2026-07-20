import { ChangeInvoiceStatusRepository } from './repository';
import { InvoiceNotFoundError, SeasonClosedError, InvalidStatusError } from '../shared/errors';
import { isSeasonClosed } from '@metacult/features-members-data-access';

export async function changeInvoiceStatus(db: any, id: number, status: string) {
  const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new InvalidStatusError();
  }

  const repo = new ChangeInvoiceStatusRepository();
  const invoiceData = await repo.getById(db, id);
  if (!invoiceData) {
    throw new InvoiceNotFoundError();
  }

  if (await isSeasonClosed(db, invoiceData.seasonId)) {
    throw new SeasonClosedError('Saison clôturée');
  }

  await repo.updateStatus(db, id, status);
}
