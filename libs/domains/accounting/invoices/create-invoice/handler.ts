import { AppError, type Db, type Tx } from '@nba/db';
import { CreateInvoiceRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { SeasonClosedError } from '../../shared/errors';
import { CreateInvoiceInput, CreateInvoiceOutput } from "./dto";

export async function createInvoice(db: Db, body: CreateInvoiceInput): Promise<CreateInvoiceOutput> {
  try {
    // Phase 1 : Lecture (hors batch)
    if (await isSeasonClosed(db, body.seasonId)) {
      throw new SeasonClosedError('Saison clôturée');
    }

    const repo = new CreateInvoiceRepository();
    const invoiceNumber = await repo.generateInvoiceNumber(db, body.seasonId);
    const seasonIdInt = await repo.resolveSeasonId(db, body.seasonId);

    // Phase 2 : Décision (en mémoire)
    const invoiceValues = {
      invoiceNumber,
      seasonId: seasonIdInt,
      date: body.date,
      dueDate: body.dueDate || body.date,
      clientName: body.clientName,
      clientAddress: body.clientAddress || null,
      clientEmail: body.clientEmail || null,
      subject: body.subject || null,
      location: body.location || null,
      period: body.period || null,
      attendees: body.attendees || null,
      totalAmountCents: (body as any).totalAmountCents ?? body.totalAmount ?? 0,
      status: 'draft',
      createdAt: new Date()
    };

    const statements = repo.buildCreateStatements(db, invoiceValues, body.items || []);

    // Phase 3 : Écriture (db.batch)
    const results = await db.batch(statements as any);

    const createdId = results[0]?.meta?.last_row_id;
    return {
      id: createdId,
      ...invoiceValues
    } as any;
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
