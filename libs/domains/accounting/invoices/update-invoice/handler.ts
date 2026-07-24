import { type Db, type Tx } from '@nba/db';
import { UpdateInvoiceRepository } from './repository';
import { Invoice } from '../../shared/invoice';
import { InvoiceNotFoundError, InvoiceNotEditableError, SeasonClosedError } from '../../shared/errors';
import { isSeasonClosed } from '@nba/members-api';
import { UpdateInvoiceId, UpdateInvoiceInput, UpdateInvoiceOutput } from "./dto";

export async function updateInvoice(db: Db, id: UpdateInvoiceId, body: UpdateInvoiceInput): Promise<UpdateInvoiceOutput> {
  const repo = new UpdateInvoiceRepository();

  // Phase 1 : Lecture (hors batch)
  const invoiceData = await repo.getById(db, id);
  if (!invoiceData) {
    throw new InvoiceNotFoundError();
  }

  const closed = await isSeasonClosed(db, invoiceData.seasonId);

  // Phase 2 : Décision (en mémoire)
  const invoice = new Invoice(invoiceData);
  if (!invoice.canBeEdited(closed)) {
    if (closed) throw new SeasonClosedError('Saison clôturée');
    throw new InvoiceNotEditableError();
  }

  const updateValues = {
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
  };

  const statements = repo.buildUpdateStatements(db, id, updateValues, body.items || []);

  // Phase 3 : Écriture (db.batch)
  await db.batch(statements as any);
}
