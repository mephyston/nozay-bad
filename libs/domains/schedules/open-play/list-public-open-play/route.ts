import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listPublicOpenPlay } from './handler';

export type Bindings = { DB: D1Database };

export const listPublicOpenPlayRoute = new Hono<{ Bindings: Bindings }>();

listPublicOpenPlayRoute.get('/open-play/public', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const limit = Number(c.req.query('limit'));

  return c.json({
    success: true,
    data: await listPublicOpenPlay(createDb(c.env.DB), {
      limit: Number.isSafeInteger(limit) && limit > 0 ? limit : undefined
    })
  });
});
