import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import type { CashMailDeps } from '../../shared/cash';
import { confirmCashReceipt, previewCashReceipt } from './handler';
import { confirmCashReceiptSchema } from './validator';

export type Bindings = { DB: D1Database };

const invalid = (result: { success: boolean }, c: any) => {
  if (!result.success) return c.json({ success: false, error: 'QR code invalide' }, 400);
};

/** Appelées par le storefront pour l'adhérent connecté : le foyer vient de sa session. */
export const createConfirmCashReceiptRoute = (deps: CashMailDeps) => {
  const route = new Hono<{ Bindings: Bindings }>();

  /*
    Réservées à l'espace adhérent. La table d'autorisation ouvre une route « service » au
    site public et aux comptes d'administration aussi ; or c'est la session de l'adhérent,
    tenue par le storefront, qui fait de la confirmation une signature.
  */
  route.use('/cash-receipts/preview', async (c, next) => {
    if (c.req.header('x-caller') !== 'storefront') return c.json({ success: false, error: 'Accès refusé' }, 403);
    await next();
  });
  route.use('/cash-receipts/confirm', async (c, next) => {
    if (c.req.header('x-caller') !== 'storefront') return c.json({ success: false, error: 'Accès refusé' }, 403);
    await next();
  });

  route.post('/cash-receipts/preview', tbValidator('json', confirmCashReceiptSchema, invalid), async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const { qr, email, memberIds } = c.req.valid('json');
    return c.json({ success: true, data: await previewCashReceipt(createDb(c.env.DB), qr, { email, memberIds }) });
  });

  route.post('/cash-receipts/confirm', tbValidator('json', confirmCashReceiptSchema, invalid), async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const { qr, email, memberIds } = c.req.valid('json');
    return c.json({ success: true, data: await confirmCashReceipt(createDb(c.env.DB), deps.mailerFor(c.env), qr, { email, memberIds }) });
  });
  return route;
};
