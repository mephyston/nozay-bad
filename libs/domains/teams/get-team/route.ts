import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getTeam } from './handler';

export type Bindings = { DB: D1Database };

export const getTeamRoute = new Hono<{ Bindings: Bindings }>();

getTeamRoute.get('/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id < 1) {
    return c.json({ success: false, error: "Identifiant d'équipe invalide" }, 400);
  }

  return c.json({ success: true, data: await getTeam(createDb(c.env.DB), id) });
});
