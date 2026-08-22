import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listOpenPlayRegistrations } from './handler';

export type Bindings = { DB: D1Database };

export const listOpenPlayRegistrationsRoute = new Hono<{ Bindings: Bindings }>();

listOpenPlayRegistrationsRoute.get('/open-play/:id/registrations', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const sessionId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
    return c.json({ success: false, error: 'Identifiant de séance invalide' }, 400);
  }

  return c.json({
    success: true,
    data: await listOpenPlayRegistrations(createDb(c.env.DB), { sessionId })
  });
});
