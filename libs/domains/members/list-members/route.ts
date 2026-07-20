import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listMembers } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listMembersRoute = new Hono<{ Bindings: Bindings }>();

listMembersRoute.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const search = c.req.query('search') || '';
  const gender = c.req.query('gender') || '';
  const type = c.req.query('type') || '';
  const status = c.req.query('status') || '';
  const season = c.req.query('season') || '';

  const paidParam = c.req.query('paid');
  let paid: boolean | undefined = undefined;
  if (paidParam === 'true') {
    paid = true;
  } else if (paidParam === 'false') {
    paid = false;
  }

  const db = drizzle(c.env.DB);
  const result = await listMembers(db, { search, gender: gender as any, type, status, season, paid }, { page, limit });

  return c.json({
    success: true,
    ...result
  });
});
