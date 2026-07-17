import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, like } from 'drizzle-orm';
import {
  categoriesTable,
  accountClassesTable,
  invoicesTable,
  invoiceItemsTable
} from '@metacult/features-accounting-data-access';
import { seasonsRouter } from './routes/seasons';
import { transactionsRouter } from './routes/transactions';
import { bankRouter } from './routes/bank';
import { checksRouter, checkDepositsRouter } from './routes/checks';
import { isSeasonClosed, AppError } from '@metacult/shared-db';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const accountingRouter = new Hono<{ Bindings: Bindings }>();


// 1. SEASONS ROUTES
accountingRouter.route('/seasons', seasonsRouter);

// 2. TRANSACTIONS ROUTES
accountingRouter.route('/transactions', transactionsRouter);

// 3. BANK TRANSACTIONS ROUTES
accountingRouter.route('/bank-transactions', bankRouter);

// 4. CHECKS ROUTES
accountingRouter.route('/checks', checksRouter);

// 5. CHECK DEPOSITS ROUTES
accountingRouter.route('/check-deposits', checkDepositsRouter);

// 6. CATEGORIES ROUTES
accountingRouter.get('/categories', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = drizzle(c.env.DB);
  try {
    const list = await db.select().from(categoriesTable).all();
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

accountingRouter.post('/categories', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const newCat = await db.insert(categoriesTable).values({
      adminLabel: body.adminLabel,
      adherentLabel: body.adherentLabel,
      hideInExpenses: body.hideInExpenses || false,
      receiptCode: body.receiptCode,
      expenseCode: body.expenseCode,
      createdAt: new Date()
    }).returning().get();
    return c.json({ success: true, data: newCat });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

accountingRouter.put('/categories/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const updated = await db.update(categoriesTable).set({
      adminLabel: body.adminLabel,
      adherentLabel: body.adherentLabel,
      hideInExpenses: body.hideInExpenses,
      receiptCode: body.receiptCode,
      expenseCode: body.expenseCode
    }).where(eq(categoriesTable.id, id)).returning().get();

    if (!updated) {
      return c.json({ success: false, error: 'Catégorie introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

accountingRouter.delete('/categories/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  try {
    const deleted = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning().get();
    if (!deleted) {
      return c.json({ success: false, error: 'Catégorie introuvable' }, 404);
    }
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 7. ACCOUNT CLASSES ROUTES
accountingRouter.get('/account-classes', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = drizzle(c.env.DB);
  try {
    const list = await db.select().from(accountClassesTable).all();
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

accountingRouter.post('/account-classes', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  if (!body.code || !body.label || !body.type) {
    return c.json({ success: false, error: 'Le code, le libellé et le type sont obligatoires.' }, 400);
  }

  try {
    const newClass = await db.insert(accountClassesTable).values({
      code: body.code.trim(),
      label: body.label.trim(),
      type: body.type,
      createdAt: new Date()
    }).returning().get();
    return c.json({ success: true, data: newClass });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

accountingRouter.put('/account-classes/:code', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const code = c.req.param('code');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const updated = await db.update(accountClassesTable).set({
      label: body.label?.trim(),
      type: body.type
    }).where(eq(accountClassesTable.code, code)).returning().get();

    if (!updated) {
      return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

accountingRouter.delete('/account-classes/:code', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const code = c.req.param('code');
  const db = drizzle(c.env.DB);
  try {
    const deleted = await db.delete(accountClassesTable).where(eq(accountClassesTable.code, code)).returning().get();
    if (!deleted) {
      return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
    }
    return c.json({ success: true, data: deleted });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 8. INVOICES ROUTES
accountingRouter.get('/invoices', async (c) => {
  const season = c.req.query('season');
  if (!season) return c.json({ success: false, error: 'Saison manquante' }, 400);
  const db = drizzle(c.env.DB);
  const data = await db.select().from(invoicesTable).where(eq(invoicesTable.seasonId, season)).all();
  return c.json({ success: true, data });
});

accountingRouter.get('/invoices/:id', async (c) => {
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

accountingRouter.post('/invoices', async (c) => {
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

accountingRouter.put('/invoices/:id', async (c) => {
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

accountingRouter.delete('/invoices/:id', async (c) => {
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

accountingRouter.post('/invoices/:id/status', async (c) => {
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
