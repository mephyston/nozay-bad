import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { r2ClubAssetStore } from '@nba/club/settings';
import { tbValidator } from '@hono/typebox-validator';
import { generateInvoice } from './handler';
import { getInvoiceParamSchema } from '../get-invoice/validator';

export type Bindings = {
  DB: D1Database;
  /** Images du papier à lettre du club. */
  MEDIA: R2Bucket;
};

export const generateInvoiceRoute = new Hono<{ Bindings: Bindings }>();

// 3 segments → distinct de `/invoices/:id` (get-invoice) et `/invoices/:id/status`.
generateInvoiceRoute.get(
  '/invoices/:id/invoice.pdf',
  tbValidator('param', getInvoiceParamSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Identifiant invalide' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const { id: idStr } = c.req.valid('param');
    const id = parseInt(idStr, 10);
    const db = createDb(c.env.DB);
    if (!c.env.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);
    const { pdf, filename } = await generateInvoice(db, r2ClubAssetStore(c.env.MEDIA), id);

    return new Response(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  }
);
