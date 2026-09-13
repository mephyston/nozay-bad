import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { r2ClubAssetStore } from '@nba/club/settings';
import { tbValidator } from '@hono/typebox-validator';
import { generateCseAttestation } from './handler';
import { getMemberCseDataParamSchema } from '../get-member-cse-data/validator';

export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
};

export const generateCseAttestationRoute = new Hono<{ Bindings: Bindings }>();

generateCseAttestationRoute.get(
  '/:id/cse-attestation.pdf',
  tbValidator('param', getMemberCseDataParamSchema, (result, c) => {
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
    if (!c.env.MEDIA) return c.json({ success: false, error: 'Bucket binding MEDIA is missing' }, 500);
    const db = createDb(c.env.DB);
    const { pdf, filename } = await generateCseAttestation(db, r2ClubAssetStore(c.env.MEDIA), id);

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
