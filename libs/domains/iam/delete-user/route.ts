import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteUser } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const deleteUserRoute = new Hono<{ Bindings: Bindings }>();

deleteUserRoute.delete('/users/:id', async (c) => {
  if (!c.env?.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isInteger(id)) {
    return c.json({ success: false, error: 'Identifiant de compte invalide' }, 400);
  }
  const db = createDb(c.env.DB);
  const deleted = await deleteUser(db, id);
  return c.json({ success: true, data: deleted });
});
