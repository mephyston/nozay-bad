import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { getMemberCseData } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getMemberCseDataRoute = new Hono<{ Bindings: Bindings }>();

getMemberCseDataRoute.get('/:id/cse-data', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);
  const data = await getMemberCseData(db, id);

  return c.json({
    success: true,
    data
  });
});
