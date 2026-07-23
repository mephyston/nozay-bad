import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { deleteAccountClass } from './handler';
import { deleteAccountClassParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const deleteAccountClassRoute = new Hono<{ Bindings: Bindings }>();

deleteAccountClassRoute.delete(
  '/account-classes/:code',
  tbValidator('param', deleteAccountClassParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { code } = c.req.valid('param');
    const db = createDb(c.env.DB);
    try {
      const deleted = await deleteAccountClass(db, code);
      if (!deleted) {
        return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
      }
      return c.json({ success: true, data: deleted });
    } catch (err: unknown) {
      return c.json({ success: false, error: (err as Error).message }, 400);
    }
  }
);
