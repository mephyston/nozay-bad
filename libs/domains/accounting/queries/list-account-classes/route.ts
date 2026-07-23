import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listAccountClasses } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const listAccountClassesRoute = new Hono<{ Bindings: Bindings }>();

listAccountClassesRoute.get('/account-classes', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = createDb(c.env.DB);
  try {
    const list = await listAccountClasses(db);
    return c.json({ success: true, data: list });
  } catch (err: unknown) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
