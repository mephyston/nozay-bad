import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createCategoryGroup, updateCategoryGroup } from './handler';
import { createCategoryGroupSchema, updateCategoryGroupSchema } from './validator';

export type Bindings = { DB: D1Database };

export const saveCategoryGroupRoute = new Hono<{ Bindings: Bindings }>();

const invalid = (result: { success: boolean }, c: any) => {
  if (!result.success) return c.json({ success: false, error: 'Regroupement invalide' }, 400);
};

saveCategoryGroupRoute.post('/category-groups', tbValidator('json', createCategoryGroupSchema, invalid), async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const created = await createCategoryGroup(createDb(c.env.DB), c.req.valid('json'));
  return c.json({ success: true, data: created }, 201);
});

saveCategoryGroupRoute.put('/category-groups/:id', tbValidator('json', updateCategoryGroupSchema, invalid), async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id < 1) return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  return c.json({ success: true, data: await updateCategoryGroup(createDb(c.env.DB), id, c.req.valid('json')) });
});
