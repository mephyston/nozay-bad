import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateRedirect } from './handler';
import { updateRedirectSchema } from './validator';

export type Bindings = { DB: D1Database };

export const updateRedirectRoute = new Hono<{ Bindings: Bindings }>();

updateRedirectRoute.put(
  '/redirects/:id',
  tbValidator('json', updateRedirectSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const redirectId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(redirectId) || redirectId < 1) {
      return c.json({ success: false, error: 'Identifiant de redirection invalide' }, 400);
    }
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    return c.json({ success: true, data: await updateRedirect(db, { redirectId, ...body }) });
  }
);
