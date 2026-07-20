import { CreateInvoiceRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { SeasonClosedError } from '../../shared/errors';

export async function createInvoice(db: any, body: {
  seasonId: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  subject?: string;
  location?: string;
  period?: string;
  attendees?: string;
  totalAmount: number;
  items?: { description: string; quantity: number; unitPrice: number }[];
}) {
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
