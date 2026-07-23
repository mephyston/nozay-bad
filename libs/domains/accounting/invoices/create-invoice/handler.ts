import { AppError, type Db, type Tx } from '@nba/db';
import { CreateInvoiceRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { SeasonClosedError } from '../../shared/errors';
import { CreateInvoiceInput, CreateInvoiceOutput } from "./dto";

export async function createInvoice(db: Db, body: CreateInvoiceInput): Promise<CreateInvoiceOutput> {
  try {
    return await db.transaction(async (txDb: Tx) => {
      if (await isSeasonClosed(txDb, body.seasonId)) {
        throw new SeasonClosedError('Saison clôturée');
      }

      const repo = new CreateInvoiceRepository();
      const invoiceNumber = await repo.generateInvoiceNumber(txDb, body.seasonId);

      return await repo.create(txDb, {
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
  } catch (err: unknown) {
    if (err instanceof SeasonClosedError || err instanceof AppError) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE constraint failed') || msg.includes('invoices.invoice_number') || msg.includes('invoice_number')) {
      throw new AppError('Numéro de facture déjà attribué, réessayez', 400);
    }
    throw err;
  }
}
