import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createCheckDeposit, depositCheckDeposit, clearCheckDeposit, deleteCheckDeposit } from './handler';
import { createCheckDepositSchema, clearCheckDepositSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createBankCheckDepositRoute = new Hono<{ Bindings: Bindings }>();

createBankCheckDepositRoute.post(
  '/check-deposits',
  tbValidator('json', createCheckDepositSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    const data = await createCheckDeposit(db, body);
    return c.json({ success: true, data });
  }
);

/*
 * Confirmation du dépôt en banque. Le corps est facultatif (`{ date? }`), d'où l'absence de
 * validateur JSON : un corps vide doit passer.
 */
createBankCheckDepositRoute.post('/check-deposits/:id/deposit', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const body = (await c.req.json().catch(() => ({}))) as { date?: unknown };
  if (body.date !== undefined && (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date))) {
    return c.json({ success: false, error: 'Validation failed: date: format AAAA-MM-JJ attendu' }, 400);
  }
  const db = createDb(c.env.DB);
  const data = await depositCheckDeposit(db, id, body.date ? { date: body.date } : {});
  return c.json({ success: true, data });
});

createBankCheckDepositRoute.post(
  '/check-deposits/:id/clear',
  tbValidator('json', clearCheckDepositSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'));
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    await clearCheckDeposit(db, id, body);
    return c.json({ success: true });
  }
);

createBankCheckDepositRoute.post('/check-deposits/:id/delete', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = createDb(c.env.DB);
  await deleteCheckDeposit(db, id);
  return c.json({ success: true });
});

