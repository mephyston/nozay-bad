import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { createItem, listItems, updateItem } from './handler';
import { itemIdParamSchema, saveItemSchema } from './validator';
import { refuseInvalid } from '../shared/validation';

export const manageItemsRoute = new Hono<{ Bindings: { DB: D1Database } }>();

manageItemsRoute.get('/items', async (c) => {
  return c.json({ success: true, data: await listItems(createDb(c.env.DB)) });
});

manageItemsRoute.post('/items', tbValidator('json', saveItemSchema, refuseInvalid), async (c) => {
  return c.json({ success: true, data: await createItem(createDb(c.env.DB), c.req.valid('json')) });
});

manageItemsRoute.put(
  '/items/:id',
  tbValidator('param', itemIdParamSchema, refuseInvalid),
  tbValidator('json', saveItemSchema, refuseInvalid),
  async (c) => {
    const id = Number(c.req.valid('param').id);
    return c.json({ success: true, data: await updateItem(createDb(c.env.DB), id, c.req.valid('json')) });
  }
);
