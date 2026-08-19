import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveFixture } from './handler';
import { saveFixtureSchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveFixtureRoute = new Hono<{ Bindings: Bindings }>();

saveFixtureRoute.put(
  '/:id/fixtures',
  tbValidator('json', saveFixtureSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const teamId = Number(c.req.param('id'));
    if (!Number.isSafeInteger(teamId) || teamId < 1) {
      return c.json({ success: false, error: "Identifiant d'équipe invalide" }, 400);
    }
    return c.json({
      success: true,
      data: await saveFixture(createDb(c.env.DB), { teamId, ...c.req.valid('json') })
    });
  }
);
