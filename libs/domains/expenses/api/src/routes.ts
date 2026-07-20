import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { Type } from '@sinclair/typebox';
import { tbValidator } from '@hono/typebox-validator';
import { listExpenses } from '../../list/handler';
import { createExpense } from '../../create/handler';
import {
  approveExpense,
  rejectExpense,
  cancelExpenseApproval,
  updateExpense
} from '../../update/handler';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const expensesRouter = new Hono<{ Bindings: Bindings }>();

expensesRouter.get('/', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const season = c.req.query('season');
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);

  const expenses = await listExpenses(db, { season, status });
  return c.json({ success: true, data: expenses });
});

const createExpenseSchema = Type.Object({
  seasonId: Type.String({ minLength: 1 }),
  description: Type.String({ minLength: 1 }),
  category: Type.Union([Type.String(), Type.Integer()]),
  amount: Type.Integer({ minimum: 1 }),
  photoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  emitterName: Type.String({ minLength: 1 }),
  memberId: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
});

const updateExpenseSchema = Type.Object({
  seasonId: Type.Optional(Type.String({ minLength: 1 })),
  description: Type.Optional(Type.String({ minLength: 1 })),
  category: Type.Optional(Type.Union([Type.String(), Type.Integer()])),
  amount: Type.Optional(Type.Integer({ minimum: 1 })),
  photoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  emitterName: Type.Optional(Type.String({ minLength: 1 })),
  memberId: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
});

expensesRouter.post('/', tbValidator('json', createExpenseSchema, (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
  }
}), async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const expense = await createExpense(db, body);
  return c.json({ success: true, data: expense });
});

expensesRouter.post('/:id/approve', async (c) => {
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

expensesRouter.post('/:id/reject', async (c) => {
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

expensesRouter.post('/:id/cancel', async (c) => {
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

expensesRouter.put('/:id', tbValidator('json', updateExpenseSchema, (result, c) => {
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
