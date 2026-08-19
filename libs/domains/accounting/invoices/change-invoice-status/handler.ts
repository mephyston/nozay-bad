import { type Db } from '@nba/db';
import { ChangeInvoiceStatusRepository, ChangeInvoiceStatusRepositoryInterface } from './repository';
import { InvoiceNotFoundError, SeasonClosedError, InvalidStatusError } from '../../shared/errors';
export async function changeInvoiceStatus(
  db: Db,
  id: number,
  status: string,
  repo: ChangeInvoiceStatusRepositoryInterface = new ChangeInvoiceStatusRepository()
): Promise<any> {
  const validStatuses = ['draft', 'sent', 'paid', 'cancelled', 'emise', 'payee', 'annulee'];
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
  return { id, status } as any;
}
