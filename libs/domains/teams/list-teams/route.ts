import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listTeams } from './handler';

export type Bindings = { DB: D1Database };

export const listTeamsRoute = new Hono<{ Bindings: Bindings }>();

listTeamsRoute.get('/', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const seasonCode = c.req.query('seasonCode');
  if (!seasonCode) return c.json({ success: false, error: 'Paramètre `seasonCode` requis.' }, 400);

  // La licence du lecteur est facultative : sans elle, la liste est simplement celle de
  // personne en particulier, comme sur les écrans d'administration.
  const licence = c.req.query('licence') ?? null;

  return c.json({ success: true, data: await listTeams(createDb(c.env.DB), seasonCode, licence) });
});
