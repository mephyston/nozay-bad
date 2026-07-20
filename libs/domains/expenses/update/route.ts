import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tbValidator } from '@hono/typebox-validator';
import {
  approveExpense,
  rejectExpense,
  cancelExpenseApproval,
  updateExpense
} from './handler';
import { updateExpenseSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateExpenseRoute = new Hono<{ Bindings: Bindings }>();

updateExpenseRoute.post('/:id/approve', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);

  const updatedExpense = await approveExpense(db, id);
  return c.json({ success: true, data: updatedExpense });
});

updateExpenseRoute.post('/:id/reject', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);

  const updatedExpense = await rejectExpense(db, id);
  return c.json({ success: true, data: updatedExpense });
});

updateExpenseRoute.post('/:id/cancel', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = drizzle(c.env.DB);

  const updatedExpense = await cancelExpenseApproval(db, id);
  return c.json({ success: true, data: updatedExpense });
});

updateExpenseRoute.put('/:id', tbValidator('json', updateExpenseSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const body = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const updated = await updateExpense(db, id, body);
  return c.json({ success: true, data: updated });
});
