import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateIndivSession } from './handler';
import { updateIndivSessionSchema } from './validator';

export type Bindings = { DB: D1Database };

export const updateIndivSessionRoute = new Hono<{ Bindings: Bindings }>();

updateIndivSessionRoute.put(
  '/indiv/:id',
  tbValidator('json', updateIndivSessionSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const sessionId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
      return c.json({ success: false, error: 'Identifiant de séance invalide' }, 400);
    }
    return c.json({
      success: true,
      data: await updateIndivSession(createDb(c.env.DB), { sessionId, ...c.req.valid('json') })
    });
  }
);
