import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { withdrawIndiv } from './handler';

export type Bindings = { DB: D1Database };

export const withdrawIndivRoute = new Hono<{ Bindings: Bindings }>();

withdrawIndivRoute.delete('/indiv/:id/requests', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const sessionId = Number(c.req.param('id'));
  const memberId = Number(c.req.query('memberId'));
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
    return c.json({ success: false, error: 'Identifiant de séance invalide' }, 400);
  }
  if (!Number.isSafeInteger(memberId) || memberId < 1) {
    return c.json({ success: false, error: 'Identifiant d’adhérent invalide' }, 400);
  }

  return c.json({ success: true, data: await withdrawIndiv(createDb(c.env.DB), { sessionId, memberId }) });
});
