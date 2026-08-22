import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { releaseOpenPlaySession } from './handler';

export type Bindings = { DB: D1Database };

export const releaseOpenPlaySessionRoute = new Hono<{ Bindings: Bindings }>();

releaseOpenPlaySessionRoute.delete('/open-play/:id/opener', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const sessionId = Number(c.req.param('id'));
  const licence = c.req.query('licence');
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
    return c.json({ success: false, error: 'Identifiant de séance invalide' }, 400);
  }
  if (!licence) return c.json({ success: false, error: 'Licence manquante' }, 400);

  return c.json({
    success: true,
    data: await releaseOpenPlaySession(createDb(c.env.DB), { sessionId, licence })
  });
});
