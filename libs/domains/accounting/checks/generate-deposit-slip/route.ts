import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { generateDepositSlip } from './handler';

export type Bindings = {
  DB: D1Database;
};

export const generateDepositSlipRoute = new Hono<{ Bindings: Bindings }>();

// 3 segments → distinct de `POST /check-deposits/:id/clear` et `/delete`.
generateDepositSlipRoute.get('/check-deposits/:id/deposit-slip.pdf', async (c) => {
  if (!c.env || !c.env.DB) {
    return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  }
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ success: false, error: 'Identifiant invalide' }, 400);
  }
  const db = createDb(c.env.DB);
  const { pdf, filename } = await generateDepositSlip(db, id);

  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
});
