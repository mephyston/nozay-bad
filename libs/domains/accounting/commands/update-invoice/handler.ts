import { type Db, type Tx } from '@nba/db';
import { UpdateInvoiceRepository } from './repository';
import { Invoice } from '../../shared/invoice';
import { InvoiceNotFoundError, InvoiceNotEditableError, SeasonClosedError } from '../../shared/errors';
import { isSeasonClosed } from '@nba/members-api';
import { UpdateInvoiceId, UpdateInvoiceInput, UpdateInvoiceOutput } from "./dto";

export async function updateInvoice(db: Db, id: UpdateInvoiceId, body: UpdateInvoiceInput): Promise<UpdateInvoiceOutput> {
  return db.transaction(async (txDb: Tx) => {
    const repo = new UpdateInvoiceRepository();
    const invoiceData = await repo.getById(txDb, id);
    if (!invoiceData) {
      throw new InvoiceNotFoundError();
    }

    const closed = await isSeasonClosed(txDb, invoiceData.seasonId);
    const invoice = new Invoice(invoiceData);
    if (!invoice.canBeEdited(closed)) {
      if (closed) throw new SeasonClosedError('Saison clôturée');
      throw new InvoiceNotEditableError();
    }

    await repo.update(txDb, id, {
      date: body.date,
      dueDate: body.dueDate,
      clientName: body.clientName,
      clientAddress: body.clientAddress || null,
      clientEmail: body.clientEmail || null,
      subject: body.subject || null,
      location: body.location || null,
      period: body.period || null,
      attendees: body.attendees || null,
      totalAmount: body.totalAmount
    }, body.items || []);
  });
}
