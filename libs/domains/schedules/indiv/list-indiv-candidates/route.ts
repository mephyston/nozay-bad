import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listIndivCandidates } from './handler';

export type Bindings = { DB: D1Database };

export const listIndivCandidatesRoute = new Hono<{ Bindings: Bindings }>();

listIndivCandidatesRoute.get('/indiv/:id/candidates', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const sessionId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
    return c.json({ success: false, error: 'Identifiant de séance invalide' }, 400);
  }
  return c.json({ success: true, data: await listIndivCandidates(createDb(c.env.DB), { sessionId }) });
});
