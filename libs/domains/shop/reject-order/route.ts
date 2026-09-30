import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { rejectOrder } from './handler';
import { Value } from '@sinclair/typebox/value';
import { rejectOrderBodySchema, rejectOrderParamSchema, REJECTION_REASON_MAX_LENGTH } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const rejectOrderRoute = new Hono<{ Bindings: Bindings }>();

rejectOrderRoute.post(
  '/orders/:id/reject',
  tbValidator('param', rejectOrderParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Validation failed: ' + [...result.errors].map(e => `${(e as any).path || (e as any).instancePath?.replace(/^\//, '') || 'field'}: ${e.message}`).join(', ') }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id: idStr } = c.req.valid('param');
    const id = parseInt(idStr, 10);
    const db = createDb(c.env.DB);

    // Corps facultatif : un appel sans corps refuse sans motif, comme avant.
    const body = await c.req.json().catch(() => ({}));
    if (!Value.Check(rejectOrderBodySchema, body)) {
      return c.json(
        { success: false, error: `Le motif du refus ne doit pas dépasser ${REJECTION_REASON_MAX_LENGTH} caractères.` },
        400
      );
    }

    const updatedOrder = await rejectOrder(db, { id, reason: body.reason });
    return c.json({ success: true, data: updatedOrder });
  }
);
