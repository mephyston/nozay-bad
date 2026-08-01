import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { uploadAttestationSignature } from './handler';
import { uploadAttestationSignatureSchema } from './validator';

export type Bindings = {
  DB: D1Database;
};

export const uploadAttestationSignatureRoute = new Hono<{ Bindings: Bindings }>();

uploadAttestationSignatureRoute.post(
  '/attestation/signature',
  tbValidator('json', uploadAttestationSignatureSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Signature manquante' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const input = c.req.valid('json');
    const db = createDb(c.env.DB);
    await uploadAttestationSignature(db, input);
    return c.json({ success: true });
  }
);
