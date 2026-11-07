import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getCurrentSession } from './handler';

export const getCurrentSessionRoute = new Hono<{ Bindings: { DB: D1Database } }>();

getCurrentSessionRoute.get('/sessions/current', async (c) => {
  return c.json({ success: true, data: await getCurrentSession(createDb(c.env.DB)) });
});
