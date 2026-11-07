import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { attachPaperCard, generatePaperCards, lookupPaperCard } from './handler';
import { attachParamSchema, attachPaperCardSchema, generatePaperCardsSchema, lookupPaperCardSchema } from './validator';
import { refuseInvalid } from '../shared/validation';

export const paperCardsRoute = new Hono<{ Bindings: { DB: D1Database } }>();

paperCardsRoute.post('/paper-cards', tbValidator('json', generatePaperCardsSchema, refuseInvalid), async (c) => {
  const { faceValueCents, quantity } = c.req.valid('json');
  return c.json({ success: true, data: await generatePaperCards(createDb(c.env.DB), faceValueCents, quantity) });
});

paperCardsRoute.post('/paper-cards/lookup', tbValidator('json', lookupPaperCardSchema, refuseInvalid), async (c) => {
  return c.json({ success: true, data: await lookupPaperCard(createDb(c.env.DB), c.req.valid('json').code) });
});

paperCardsRoute.post(
  '/cards/:id/attach-paper',
  tbValidator('param', attachParamSchema, refuseInvalid),
  tbValidator('json', attachPaperCardSchema, refuseInvalid),
  async (c) => {
    const { deviceId, code } = c.req.valid('json');
    const data = await attachPaperCard(createDb(c.env.DB), Number(c.req.valid('param').id), deviceId, code);
    return c.json({ success: true, data });
  }
);
