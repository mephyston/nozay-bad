import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { closeSession } from './handler';
import { closeSessionParamSchema, closeSessionSchema } from './validator';
import { actorEmail, refuseInvalid } from '../shared/validation';

export const closeSessionRoute = new Hono<{ Bindings: { DB: D1Database } }>();

closeSessionRoute.post(
  '/sessions/:id/close',
  tbValidator('param', closeSessionParamSchema, refuseInvalid),
  tbValidator('json', closeSessionSchema, refuseInvalid),
  async (c) => {
    const data = await closeSession(createDb(c.env.DB), {
      sessionId: Number(c.req.valid('param').id),
      countedCashCents: c.req.valid('json').countedCashCents,
      closedByEmail: actorEmail(c)
    });
    return c.json({ success: true, data });
  }
);
