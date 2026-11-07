import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getCardsDebtCents } from '../shared/queries.repository';
import { getCurrentSession } from './handler';

export const getCurrentSessionRoute = new Hono<{ Bindings: { DB: D1Database } }>();

getCurrentSessionRoute.get('/cards/debt', async (c) => {
  return c.json({ success: true, data: { cardsDebtCents: await getCardsDebtCents(createDb(c.env.DB)) } });
});

getCurrentSessionRoute.get('/sessions/current', async (c) => {
  return c.json({ success: true, data: await getCurrentSession(createDb(c.env.DB)) });
});
