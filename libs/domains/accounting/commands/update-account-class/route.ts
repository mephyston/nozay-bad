import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { tbValidator } from '@hono/typebox-validator';
import { updateAccountClass } from './handler';
import { updateAccountClassSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateAccountClassRoute = new Hono<{ Bindings: Bindings }>();

updateAccountClassRoute.put(
  '/account-classes/:code',
  tbValidator('json', updateAccountClassSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${e.instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const code = c.req.param('code');
    const body = c.req.valid('json');
    const db = drizzle(c.env.DB);
    try {
      const updated = await updateAccountClass(db, code, body);
      if (!updated) {
        return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
      }
      return c.json({ success: true, data: updated });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  }
);
