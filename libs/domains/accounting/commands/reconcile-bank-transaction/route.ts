import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { reconcileBankTransaction, reconcileBulkTransactions } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const reconcileBankTransactionRoute = new Hono<{ Bindings: Bindings }>();

reconcileBankTransactionRoute.post('/bank-transactions/reconcile-bulk', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const requests = body.requests;
  if (!requests || !Array.isArray(requests)) {
    return c.json({ success: false, error: 'Missing requests array.' }, 400);
  }
  const db = drizzle(c.env.DB);
  const count = await reconcileBulkTransactions(db, requests);
  return c.json({ success: true, count });
});

reconcileBankTransactionRoute.post('/bank-transactions/:id/reconcile', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  await reconcileBankTransaction(db, id, body);
  return c.json({ success: true });
});
