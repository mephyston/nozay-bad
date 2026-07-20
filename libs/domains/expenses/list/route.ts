import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listExpenses } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listExpensesRoute = new Hono<{ Bindings: Bindings }>();

listExpensesRoute.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);

  const expenses = await listExpenses(db, { season, status });
  return c.json({ success: true, data: expenses });
});
