import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listIndivSessions } from './handler';

export type Bindings = { DB: D1Database };

export const listIndivSessionsRoute = new Hono<{ Bindings: Bindings }>();

listIndivSessionsRoute.get('/indiv', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const query = c.req.query();
  const memberId = Number(query.memberId);
  const limit = Number(query.limit);

  return c.json({
    success: true,
    data: await listIndivSessions(createDb(c.env.DB), {
      from: query.from || undefined,
      to: query.to || undefined,
      memberId: Number.isSafeInteger(memberId) && memberId > 0 ? memberId : undefined,
      group: query.group || undefined,
      includeCancelled: query.includeCancelled === '0' || query.includeCancelled === 'false' ? false : undefined,
      limit: Number.isSafeInteger(limit) && limit > 0 ? limit : undefined
    })
  });
});
