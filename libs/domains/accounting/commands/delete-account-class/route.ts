import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { deleteAccountClass } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const deleteAccountClassRoute = new Hono<{ Bindings: Bindings }>();

deleteAccountClassRoute.delete('/account-classes/:code', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const code = c.req.param('code');
  const db = createDb(c.env.DB);
  try {
    const deleted = await deleteAccountClass(db, code);
    if (!deleted) {
      return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
    }
    return c.json({ success: true, data: deleted });
  } catch (err: unknown) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
