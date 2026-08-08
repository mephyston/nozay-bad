import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { updateUserRoles } from './handler';
import { updateUserBodySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const updateUserRolesRoute = new Hono<{ Bindings: Bindings }>();

updateUserRolesRoute.put(
  '/users/:id',
  tbValidator('json', updateUserBodySchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Modification invalide : rôle inconnu.' }, 400);
    }
  }),
  async (c) => {
    if (!c.env?.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'), 10);
    if (!Number.isInteger(id)) {
      return c.json({ success: false, error: 'Identifiant de compte invalide' }, 400);
    }
    const { name, roles } = c.req.valid('json');
    const db = createDb(c.env.DB);
    const updated = await updateUserRoles(db, id, { name, roles });
    return c.json({ success: true, data: updated });
  }
);
