import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listInvoices } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listInvoicesRoute = new Hono<{ Bindings: Bindings }>();

listInvoicesRoute.get('/invoices', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Saison manquante' }, 400);
  }
  const db = drizzle(c.env.DB);
  const data = await listInvoices(db, season);
  return c.json({ success: true, data });
});
