import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listNavItems } from './handler';

export type Bindings = { DB: D1Database };

export const listNavItemsRoute = new Hono<{ Bindings: Bindings }>();

listNavItemsRoute.get('/nav', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const location = c.req.query('location');
  const db = createDb(c.env.DB);
  return c.json({
    success: true,
    data: await listNavItems(db, {
      location: location === 'header' || location === 'footer' ? location : undefined
    })
  });
});
