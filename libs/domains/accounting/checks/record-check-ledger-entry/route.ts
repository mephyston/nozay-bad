import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { analyzeCheckImage, createCheck, deleteCheck } from './handler';
import { createCheckSchema } from './validator';

export type Bindings = {
  DB: D1Database;
  AI: import('./handler').VisionAi;
};

export const recordCheckTransactionRoute = new Hono<{ Bindings: Bindings }>();

recordCheckTransactionRoute.post('/checks/analyze', async (c) => {
  if (!c.env || !c.env.DB || !c.env.AI) {
    return c.json({ success: false, error: 'Database or AI binding is missing' }, 500);
  }
  const formData = await c.req.parseBody();
  const file = formData.file;
  const db = createDb(c.env.DB);
  const data = await analyzeCheckImage(db, c.env.AI, file);
  return c.json({ success: true, data });
});

recordCheckTransactionRoute.post(
  '/checks',
  tbValidator('json', createCheckSchema, (result, c) => {
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
    try {
      const data = await createCheck(db, body);
      return c.json({ success: true, data });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);

recordCheckTransactionRoute.delete('/checks/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'));
  const db = createDb(c.env.DB);
  await deleteCheck(db, id);
  return c.json({ success: true });
});
