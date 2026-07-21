import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { analyzeCheckImage, createCheck, deleteCheck } from './handler';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const recordCheckTransactionRoute = new Hono<{ Bindings: Bindings }>();

recordCheckTransactionRoute.post('/checks/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  const formData = await c.req.parseBody();
  const file = formData.file;
  const db = drizzle(c.env.DB);
  const data = await analyzeCheckImage(db, c.env.AI, file);
  return c.json({ success: true, data });
});

recordCheckTransactionRoute.post('/checks', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await createCheck(db, body);
  return c.json({ success: true, data });
});

recordCheckTransactionRoute.delete('/checks/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  await deleteCheck(db, id);
  return c.json({ success: true });
});
