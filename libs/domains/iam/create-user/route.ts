import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createUser } from './handler';
import { createUserBodySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const createUserRoute = new Hono<{ Bindings: Bindings }>();

createUserRoute.post(
  '/users',
  tbValidator('json', createUserBodySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Compte invalide : adresse e-mail ou rôle inconnu.' }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { email, name, roles } = c.req.valid('json');
    const db = createDb(c.env.DB);
    const created = await createUser(db, { email, name, roles });
    return c.json({ success: true, data: created }, 201);
  }
);
