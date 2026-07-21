import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { analyzeBankTransactions } from './handler';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const analyzeBankTransactionsRoute = new Hono<{ Bindings: Bindings }>();

analyzeBankTransactionsRoute.post('/bank-transactions/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const singleId = c.req.query('id');
  const idNum = singleId ? parseInt(singleId) : undefined;
  const db = drizzle(c.env.DB);
  const result = await analyzeBankTransactions(db, c.env.AI, { seasonId: season, singleId: idNum });
  return c.json({ success: true, ...result });
});
