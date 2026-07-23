import { type Db } from '@nba/db';
import { ChangeInvoiceStatusRepository, ChangeInvoiceStatusRepositoryInterface } from './repository';
import { InvoiceNotFoundError, SeasonClosedError, InvalidStatusError } from '../../shared/errors';
import { ChangeInvoiceStatusId, ChangeInvoiceStatusStatus, ChangeInvoiceStatusOutput } from "./dto";

export async function changeInvoiceStatus(
  db: Db,
  id: ChangeInvoiceStatusId,
  status: ChangeInvoiceStatusStatus,
  repo: ChangeInvoiceStatusRepositoryInterface = new ChangeInvoiceStatusRepository()
): Promise<ChangeInvoiceStatusOutput> {
  const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new InvalidStatusError();
  }

  const invoiceData = await repo.getById(db, id);
  if (!invoiceData) {
    throw new InvoiceNotFoundError();
  }

  if (await repo.isSeasonClosed(db, invoiceData.seasonId)) {
    throw new SeasonClosedError('Saison clôturée');
  }

  await repo.updateStatus(db, id, status);
}
