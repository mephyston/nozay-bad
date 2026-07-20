import { CreateInvoiceRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { SeasonClosedError } from '../../shared/errors';
import { CreateInvoiceInput, CreateInvoiceOutput } from "./dto";

export async function createInvoice(db: any, body: CreateInvoiceInput): Promise<CreateInvoiceOutput> {
  return db.transaction(async (txDb: any) => {
    if (await isSeasonClosed(txDb, body.seasonId)) {
      throw new SeasonClosedError('Saison clôturée');
    }

    const repo = new CreateInvoiceRepository();
    const invoiceNumber = await repo.generateInvoiceNumber(txDb, body.seasonId);

    return repo.create(txDb, {
      invoiceNumber,
      seasonId: body.seasonId,
      date: body.date,
      dueDate: body.dueDate,
      clientName: body.clientName,
      clientAddress: body.clientAddress || null,
      clientEmail: body.clientEmail || null,
      subject: body.subject || null,
      location: body.location || null,
      period: body.period || null,
      attendees: body.attendees || null,
      totalAmount: body.totalAmount,
      status: 'draft',
      createdAt: new Date()
    }, body.items || []);
  });
}
