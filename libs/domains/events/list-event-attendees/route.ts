import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listEventAttendees } from './handler';

export type Bindings = { DB: D1Database };

export const listEventAttendeesRoute = new Hono<{ Bindings: Bindings }>();

listEventAttendeesRoute.get('/:id/attendees', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const eventId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(eventId) || eventId < 1) {
    return c.json({ success: false, error: "Identifiant d'événement invalide" }, 400);
  }

  return c.json({
    success: true,
    data: await listEventAttendees(createDb(c.env.DB), { eventId })
  });
});
