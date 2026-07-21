import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listBankTransactions } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listBankTransactionsRoute = new Hono<{ Bindings: Bindings }>();

listBankTransactionsRoute.get('/bank-transactions', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const status = c.req.query('status');
  const accountId = c.req.query('accountId');
  const db = drizzle(c.env.DB);
  const data = await listBankTransactions(db, { seasonId: season, filters: { status, accountId } });
  return c.json({ success: true, data });
});
