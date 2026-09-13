import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { r2ClubAssetStore } from '@nba/club/settings';
import { generateDepositSlip } from './handler';

export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
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
  if (!c.env.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);
  const { pdf, filename } = await generateDepositSlip(db, r2ClubAssetStore(c.env.MEDIA), id);

  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
});
