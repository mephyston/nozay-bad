import { Hono } from 'hono';
import { createDb, AppError } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateInternalTransfer } from './handler';
import { updateInternalTransferSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateInternalTransferRoute = new Hono<{ Bindings: Bindings }>();

const handleUpdate = async (c: any) => {
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
    const data = await updateInternalTransfer(db, id, body);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, err instanceof AppError ? err.status : 400);
  }
};

const updateValidator = tbValidator('json', updateInternalTransferSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
});

updateInternalTransferRoute.put('/internal-transfers/:id', updateValidator, handleUpdate);
