import { getClubSettings, localDate } from '@nba/club/settings';
import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { Type } from '@sinclair/typebox';
import { getClubFunctionsStatus, listClubFunctions } from './handler';

export type Bindings = {
  DB: D1Database;
};

const querySchema = Type.Object({
  season: Type.String({ minLength: 1 })
});


export const listClubFunctionsRoute = new Hono<{ Bindings: Bindings }>();

// GET /members/club-functions/status — les fonctions de la saison en cours sont-elles
// définies ? Alimente l'indicateur « action à réaliser » du menu Dirigeants.
listClubFunctionsRoute.get('/club-functions/status', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const db = createDb(c.env.DB);
  // Jour civil du club — le serveur tourne en UTC, la saison se juge en heure locale.
  const today = localDate(new Date(), (await getClubSettings(db)).timezone);
  return c.json({ success: true, data: await getClubFunctionsStatus(db, today) });
});

// GET /members/club-functions?season=25-26 — fonctions au club attribuées sur la saison.
// Route littérale : montée avant `/:licence` pour ne pas être lue comme une licence.
listClubFunctionsRoute.get(
  '/club-functions',
  tbValidator('query', querySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Paramètre season requis' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { season } = c.req.valid('query');
    const db = createDb(c.env.DB);
    const data = await listClubFunctions(db, season);
    return c.json({ success: true, data });
  }
);
