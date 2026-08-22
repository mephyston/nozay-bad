import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteOpenPlayOpener } from './handler';

export type Bindings = { DB: D1Database };

export const deleteOpenPlayOpenerRoute = new Hono<{ Bindings: Bindings }>();

deleteOpenPlayOpenerRoute.delete('/open-play/openers/:id', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const openerId = Number(c.req.param('id'));
  if (!Number.isSafeInteger(openerId) || openerId < 1) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }

  return c.json({
    success: true,
    data: await deleteOpenPlayOpener(createDb(c.env.DB), { openerId })
  });
});
