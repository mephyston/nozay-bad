import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateLedgerEntry } from './handler';
import { updateTransactionSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateTransactionRoute = new Hono<{ Bindings: Bindings }>();

updateTransactionRoute.put(
  '/ledger-entries/:id',
  tbValidator('json', updateTransactionSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    }
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    try {
      const data = await updateLedgerEntry(db, id, body);
      return c.json({ success: true, data });
    } catch (err: unknown) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);
