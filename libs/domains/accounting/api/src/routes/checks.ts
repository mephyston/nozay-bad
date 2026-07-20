import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { listChecks, listCheckDeposits } from '../../../queries/list-checks/handler';
import { analyzeCheckImage, createCheck, deleteCheck } from '../../../commands/record-check-transaction/handler';
import { createCheckDeposit, clearCheckDeposit, deleteCheckDeposit } from '../../../commands/create-bank-check-deposit/handler';
import type { Bindings } from '../routes';

export const checksRouter = new Hono<{ Bindings: Bindings }>();
export const checkDepositsRouter = new Hono<{ Bindings: Bindings }>();

checksRouter.post('/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  try {
    const formData = await c.req.parseBody();
    const file = formData.file;
    const db = drizzle(c.env.DB);
    const data = await analyzeCheckImage(db, c.env.AI, file);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, err.status || 500);
  }
});

checksRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);
  const data = await listChecks(db, season, status);
  return c.json({ success: true, data });
});

checksRouter.post('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await createCheck(db, body);
  return c.json({ success: true, data });
});

checksRouter.delete('/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  await deleteCheck(db, id);
  return c.json({ success: true });
});

checkDepositsRouter.post('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  const data = await createCheckDeposit(db, body);
  return c.json({ success: true, data });
});

checkDepositsRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  if (!season) {
    return c.json({ success: false, error: 'Missing season query parameter' }, 400);
  }
  const db = drizzle(c.env.DB);
  const data = await listCheckDeposits(db, season);
  return c.json({ success: true, data });
});

checkDepositsRouter.post('/:id/clear', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  await clearCheckDeposit(db, id, body);
  return c.json({ success: true });
});

checkDepositsRouter.post('/:id/delete', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB);
  await deleteCheckDeposit(db, id);
  return c.json({ success: true });
});
