import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { listProductCategories, createProductCategory, updateProductCategory, deleteProductCategory } from './handler';
import { productCategorySchema, updateProductCategorySchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const manageProductCategoriesRoute = new Hono<{ Bindings: Bindings }>();

manageProductCategoriesRoute.get('/product-categories', async (c) => {
  if (!c.env || !c.env.DB) return c.json({ success: false, error: 'DB binding missing' }, 500);
  const db = createDb(c.env.DB);
  const data = await listProductCategories(db);
  return c.json({ success: true, data });
});

manageProductCategoriesRoute.post(
  '/product-categories',
  tbValidator('json', productCategorySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env || !c.env.DB) return c.json({ success: false, error: 'DB binding missing' }, 500);
    const db = createDb(c.env.DB);
    const data = c.req.valid('json');
    const result = await createProductCategory(db, data);
    return c.json({ success: true, data: result });
  }
);

manageProductCategoriesRoute.put(
  '/product-categories/:id',
  tbValidator('json', updateProductCategorySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Validation failed' }, 400);
  }),
  async (c) => {
    if (!c.env || !c.env.DB) return c.json({ success: false, error: 'DB binding missing' }, 500);
    const db = createDb(c.env.DB);
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) return c.json({ success: false, error: 'Invalid ID' }, 400);
    const data = c.req.valid('json');
    const result = await updateProductCategory(db, id, data);
    return c.json({ success: true, data: result });
  }
);

manageProductCategoriesRoute.delete('/product-categories/:id', async (c) => {
  if (!c.env || !c.env.DB) return c.json({ success: false, error: 'DB binding missing' }, 500);
  const db = createDb(c.env.DB);
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ success: false, error: 'Invalid ID' }, 400);
  try {
    await deleteProductCategory(db, id);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
