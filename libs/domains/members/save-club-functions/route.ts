import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { saveClubFunctions } from './handler';
import { saveClubFunctionsBodySchema, saveClubFunctionsParamSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const saveClubFunctionsRoute = new Hono<{ Bindings: Bindings }>();

// PUT /members/:licence/club-functions — remplace les fonctions au club de l'adhérent.
saveClubFunctionsRoute.put(
  '/:licence/club-functions',
  tbValidator('param', saveClubFunctionsParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Licence invalide' }, 400);
    }
  }),
  tbValidator('json', saveClubFunctionsBodySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { success: false, error: 'Validation failed: season (string) et functions (liste) requis' },
        400
      );
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { licence } = c.req.valid('param');
    const { season, functions } = c.req.valid('json');
    const db = createDb(c.env.DB);
    const data = await saveClubFunctions(db, { licence, season, functions });
    return c.json({ success: true, data });
  }
);
