import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, like } from 'drizzle-orm';
import {
  invoicesTable,
  invoiceItemsTable
} from '@metacult/features-accounting-data-access';
import { isSeasonClosed } from '@metacult/features-members-data-access';
import { AppError } from '@metacult/shared-db';
import type { Bindings } from '../routes';

export const invoicesRouter = new Hono<{ Bindings: Bindings }>();

// 8. INVOICES ROUTES
invoicesRouter.get('/', async (c) => {
  const season = c.req.query('season');
  if (!season) return c.json({ success: false, error: 'Saison manquante' }, 400);
  const db = drizzle(c.env.DB);
  const data = await db.select().from(invoicesTable).where(eq(invoicesTable.seasonId, season)).all();
  return c.json({ success: true, data });
});

invoicesRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
  const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).all();
  return c.json({ success: true, data: { ...invoice, items } });
});

invoicesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  if (await isSeasonClosed(db, body.seasonId)) {
    throw new AppError('Saison clôturée', 400);
  }
  const seasonShort = body.seasonId.replace('-', '');
  const prefix = `FAC-${seasonShort}-NBA91-`;
  const lastInvoices = await db.select()
    .from(invoicesTable)
    .where(like(invoicesTable.invoiceNumber, `${prefix}%`))
    .all();
  let nextNum = 1;
  if (lastInvoices.length > 0) {
    const nums = lastInvoices.map(inv => {
      const parts = inv.invoiceNumber.split('-');
      return parseInt(parts[parts.length - 1]) || 0;
    });
    nextNum = Math.max(...nums) + 1;
  }
  const invoiceNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

  const [newInvoice] = await db.insert(invoicesTable).values({
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
  }).returning();

  if (body.items && body.items.length > 0) {
    for (const item of body.items) {
      await db.insert(invoiceItemsTable).values({
        invoiceId: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        createdAt: new Date()
      });
    }
  }

  return c.json({ success: true, data: newInvoice });
});

invoicesRouter.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
  if (invoice.status !== 'draft') {
    return c.json({ success: false, error: 'Modification impossible car non au statut Brouillon' }, 400);
  }
  if (await isSeasonClosed(db, invoice.seasonId)) {
    throw new AppError('Saison clôturée', 400);
  }

  await db.update(invoicesTable).set({
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
  }).where(eq(invoicesTable.id, id)).run();

  await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).run();
  if (body.items && body.items.length > 0) {
    for (const item of body.items) {
      await db.insert(invoiceItemsTable).values({
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        createdAt: new Date()
      });
    }
  }
  return c.json({ success: true });
});

invoicesRouter.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
  if (invoice.status !== 'draft' && invoice.status !== 'cancelled') {
    return c.json({ success: false, error: 'Seules les factures brouillon ou annulées peuvent être supprimées' }, 400);
  }
  if (await isSeasonClosed(db, invoice.seasonId)) {
    throw new AppError('Saison clôturée', 400);
  }
  await db.delete(invoicesTable).where(eq(invoicesTable.id, id)).run();
  return c.json({ success: true });
});

invoicesRouter.post('/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const { status } = await c.req.json();
  const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return c.json({ success: false, error: 'Statut invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
  if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
  if (await isSeasonClosed(db, invoice.seasonId)) {
    throw new AppError('Saison clôturée', 400);
  }
  await db.update(invoicesTable).set({ status }).where(eq(invoicesTable.id, id)).run();
  return c.json({ success: true });
});
