import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listTransactions } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listTransactionsRoute = new Hono<{ Bindings: Bindings }>();

listTransactionsRoute.get('/transactions', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const seasonId = c.req.query('season');
  const unreconciledChequesOnly = c.req.query('unreconciledCheques') === 'true';

  if (!seasonId && !unreconciledChequesOnly) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const accountId = c.req.query('accountId');
  const type = c.req.query('type');
  const category = c.req.query('category');
  const classCode = c.req.query('classCode');
  const memberId = c.req.query('memberId');

  const db = drizzle(c.env.DB);
  const result = await listTransactions(db, {
    seasonId,
    accountId,
    type,
    category,
    classCode,
    memberId,
    unreconciledChequesOnly
  }, { page, limit });

  return c.json({
    success: true,
    ...result
  });
});
