import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { adminUsersTable } from './shared/schema';

export const iamRouter = new Hono<{ Bindings: { DB: D1Database } }>();

iamRouter.get('/users', async (c) => {
  const db = drizzle(c.env.DB);
  const users = await db.select().from(adminUsersTable).all();
  return c.json({ data: users });
});

iamRouter.post('/users', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const { email, name, permissions } = body;
  
  const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email)).get();
  if (existing) {
    return c.json({ error: 'Cet email existe déjà' }, 400);
  }

  const result = await db.insert(adminUsersTable).values({
    email,
    name: name || email.split('@')[0],
    permissions: permissions || [],
    createdAt: new Date()
  }).returning().get();

  return c.json({ data: result }, 201);
});

iamRouter.put('/users/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();
  
  const result = await db.update(adminUsersTable)
    .set({
      name: body.name,
      permissions: body.permissions
    })
    .where(eq(adminUsersTable.id, id))
    .returning().get();

  return c.json({ data: result });
});

iamRouter.delete('/users/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id)).run();
  return c.json({ success: true });
});
