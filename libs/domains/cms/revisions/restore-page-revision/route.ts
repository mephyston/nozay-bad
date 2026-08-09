import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { restorePageRevision } from './handler';

export type Bindings = { DB: D1Database };

export const restorePageRevisionRoute = new Hono<{ Bindings: Bindings }>();

restorePageRevisionRoute.post('/pages/:id/revisions/:revisionId/restore', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const pageId = Number(c.req.param('id'));
  const revisionId = Number(c.req.param('revisionId'));
  if (!Number.isSafeInteger(pageId) || pageId < 1 || !Number.isSafeInteger(revisionId) || revisionId < 1) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = createDb(c.env.DB);
  const authorEmail = c.req.header('x-user-email') || '';
  return c.json({ success: true, data: await restorePageRevision(db, { pageId, revisionId }, authorEmail) });
});
