import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { getMemberByLicence } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const getMemberByLicenceRoute = new Hono<{ Bindings: Bindings }>();

getMemberByLicenceRoute.get('/:licence', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }

  const licence = c.req.param('licence');
  const season = c.req.query('season') || '';
  const db = drizzle(c.env.DB);

  const member = await getMemberByLicence(db, licence, season);

  return c.json({
    success: true,
    data: member,
  });
});
