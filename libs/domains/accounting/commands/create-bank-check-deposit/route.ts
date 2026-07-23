import { Hono } from 'hono';
import { createDb } from '@metacult/shared-db';
import { tbValidator } from '@hono/typebox-validator';
import { createCheckDeposit, clearCheckDeposit, deleteCheckDeposit } from './handler';
import { createCheckDepositSchema, clearCheckDepositSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createBankCheckDepositRoute = new Hono<{ Bindings: Bindings }>();

createBankCheckDepositRoute.post(
  '/check-deposits',
  tbValidator('json', createCheckDepositSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
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

createBankCheckDepositRoute.post(
  '/check-deposits/:id/clear',
  tbValidator('json', clearCheckDepositSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
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

