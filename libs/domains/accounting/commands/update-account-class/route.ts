import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { updateAccountClass } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const updateAccountClassRoute = new Hono<{ Bindings: Bindings }>();

updateAccountClassRoute.put('/account-classes/:code', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const code = c.req.param('code');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const updated = await updateAccountClass(db, code, body);
    if (!updated) {
      return c.json({ success: false, error: 'Classe de compte introuvable' }, 404);
    }
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
