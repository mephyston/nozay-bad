import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listOpenPlaySessions } from './handler';

export type Bindings = { DB: D1Database };

export const listOpenPlaySessionsRoute = new Hono<{ Bindings: Bindings }>();

listOpenPlaySessionsRoute.get('/open-play', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const query = c.req.query();
  const memberId = Number(query.memberId);
  const limit = Number(query.limit);

  return c.json({
    success: true,
    data: await listOpenPlaySessions(createDb(c.env.DB), {
      // L'administration passe `from` pour remonter l'historique ; à défaut, la lecture
      // commence aujourd'hui, ce que veut l'espace adhérent.
      from: query.from || undefined,
      to: query.to || undefined,
      memberId: Number.isSafeInteger(memberId) && memberId > 0 ? memberId : undefined,
      licence: query.licence || undefined,
      includeCancelled: query.includeCancelled === '0' ? false : undefined,
      limit: Number.isSafeInteger(limit) && limit > 0 ? limit : undefined
    })
  });
});
