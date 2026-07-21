import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { createCheckDeposit, clearCheckDeposit, deleteCheckDeposit } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const createBankCheckDepositRoute = new Hono<{ Bindings: Bindings }>();

createBankCheckDepositRoute.post('/check-deposits', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await createCheckDeposit(db, body);
  return c.json({ success: true, data });
});

createBankCheckDepositRoute.post('/check-deposits/:id/clear', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  await clearCheckDeposit(db, id, body);
  return c.json({ success: true });
});

createBankCheckDepositRoute.post('/check-deposits/:id/delete', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  await deleteCheckDeposit(db, id);
  return c.json({ success: true });
});
