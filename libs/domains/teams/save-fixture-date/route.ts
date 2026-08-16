import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveFixtureDate } from './handler';
import { saveFixtureDateSchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveFixtureDateRoute = new Hono<{ Bindings: Bindings }>();

saveFixtureDateRoute.put(
  '/:id/days/:number/date',
  tbValidator('json', saveFixtureDateSchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

    const teamId = Number(c.req.param('id'));
    const dayNumber = Number(c.req.param('number'));
    if (!Number.isSafeInteger(teamId) || teamId < 1) {
      return c.json({ success: false, error: "Identifiant d'équipe invalide" }, 400);
    }
    if (!Number.isSafeInteger(dayNumber) || dayNumber < 1) {
      return c.json({ success: false, error: 'Numéro de journée invalide' }, 400);
    }

    return c.json({
      success: true,
      data: await saveFixtureDate(createDb(c.env.DB), { teamId, dayNumber, ...c.req.valid('json') })
    });
  }
);
