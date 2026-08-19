import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listPageRevisions } from './handler';

export type Bindings = { DB: D1Database };

export const listPageRevisionsRoute = new Hono<{ Bindings: Bindings }>();

listPageRevisionsRoute.get('/pages/:id/revisions', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const pageId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(pageId) || pageId < 1) {
    return c.json({ success: false, error: 'Identifiant de page invalide' }, 400);
  }
  const db = createDb(c.env.DB);
  return c.json({ success: true, data: await listPageRevisions(db, { pageId }) });
});
