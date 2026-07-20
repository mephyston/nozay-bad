import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { createAccountClass } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const createAccountClassRoute = new Hono<{ Bindings: Bindings }>();

createAccountClassRoute.post('/account-classes', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  if (!body.code || !body.label || !body.type) {
    return c.json({ success: false, error: 'Le code, le libellé et le type sont obligatoires.' }, 400);
  }

  try {
    const newClass = await createAccountClass(db, body);
    return c.json({ success: true, data: newClass });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
