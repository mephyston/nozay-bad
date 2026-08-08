import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deletePage } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const deletePageRoute = new Hono<{ Bindings: Bindings }>();

deletePageRoute.delete('/pages/:id', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const pageId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(pageId) || pageId < 1) {
    return c.json({ success: false, error: 'Identifiant de page invalide' }, 400);
  }
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await deletePage(db, { pageId }) });
});
