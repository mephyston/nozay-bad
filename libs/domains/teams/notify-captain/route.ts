import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { notifyCaptain } from './handler';

export type Bindings = { DB: D1Database };

export const notifyCaptainRoute = new Hono<{ Bindings: Bindings }>();

notifyCaptainRoute.post('/:id/days/:number/notify-captain', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const teamId = Number(c.req.param('id'));
  const dayNumber = Number(c.req.param('number'));
  if (!Number.isSafeInteger(teamId) || teamId < 1) {
    return c.json({ success: false, error: "Identifiant d'équipe invalide" }, 400);
  }
  if (!Number.isSafeInteger(dayNumber) || dayNumber < 1) {
    return c.json({ success: false, error: 'Numéro de journée invalide' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  return c.json({
    success: true,
    data: await notifyCaptain(createDb(c.env.DB), { teamId, dayNumber, note: body?.note ?? null })
  });
});
