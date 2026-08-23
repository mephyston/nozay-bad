import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listOpenPlayAttendees } from './handler';

export type Bindings = { DB: D1Database };

export const listOpenPlayAttendeesRoute = new Hono<{ Bindings: Bindings }>();

listOpenPlayAttendeesRoute.get('/open-play/:id/attendees', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const sessionId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
    return c.json({ success: false, error: 'Identifiant de séance invalide' }, 400);
  }

  return c.json({
    success: true,
    data: await listOpenPlayAttendees(createDb(c.env.DB), { sessionId })
  });
});
