import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { setMemberExpenseAuthorization } from './handler';
import { setExpenseAuthParamSchema, setExpenseAuthBodySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const setExpenseAuthorizationRoute = new Hono<{ Bindings: Bindings }>();

// PATCH /members/:id/expense-authorization — bascule l'autorisation de note de frais.
// Méthode distincte de GET /:licence : aucun conflit de routage.
setExpenseAuthorizationRoute.patch(
  '/:id/expense-authorization',
  tbValidator('param', setExpenseAuthParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    }
  }),
  tbValidator('json', setExpenseAuthBodySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: authorized (boolean) requis' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id } = c.req.valid('param');
    const { authorized } = c.req.valid('json');
    const db = createDb(c.env.DB);
    const data = await setMemberExpenseAuthorization(db, parseInt(id, 10), authorized);
    return c.json({ success: true, data });
  }
);
