import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updatePage } from './handler';
import { updatePageSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updatePageRoute = new Hono<{ Bindings: Bindings }>();

updatePageRoute.put(
  '/pages/:id',
  tbValidator('json', updatePageSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const pageId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(pageId) || pageId < 1) {
      return c.json({ success: false, error: 'Identifiant de page invalide' }, 400);
    }
    const body = c.req.valid('json');
    const db = createDb(c.env.DB);
    const authorEmail = c.req.header('x-user-email') || '';
    return c.json({ success: true, data: await updatePage(db, { pageId, ...body }, authorEmail) });
  }
);
