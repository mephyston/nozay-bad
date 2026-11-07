import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { tbValidator } from '@hono/typebox-validator';
import { deleteCard, getMovement, getWallet, issueQrToken, revokeOtherDevices } from './handler';
import { movementParamSchema, walletDeviceSchema, walletParamSchema } from './validator';
import { refuseInvalid, tokenSecret } from '../shared/validation';

export const cardWalletRoute = new Hono<{ Bindings: { DB: D1Database; BUVETTE_TOKEN_SECRET?: string } }>();

const param = tbValidator('param', walletParamSchema, refuseInvalid);
const device = tbValidator('json', walletDeviceSchema, refuseInvalid);

cardWalletRoute.post('/cards/:id/wallet', param, device, async (c) => {
  const data = await getWallet(createDb(c.env.DB), Number(c.req.valid('param').id), c.req.valid('json').deviceId);
  return c.json({ success: true, data });
});

cardWalletRoute.post('/cards/:id/qr-token', param, device, async (c) => {
  const data = await issueQrToken(createDb(c.env.DB), tokenSecret(c), Number(c.req.valid('param').id), c.req.valid('json').deviceId);
  return c.json({ success: true, data });
});

cardWalletRoute.post('/cards/:id/revoke-devices', param, device, async (c) => {
  await revokeOtherDevices(createDb(c.env.DB), Number(c.req.valid('param').id), c.req.valid('json').deviceId);
  return c.json({ success: true, data: null });
});

cardWalletRoute.post('/cards/:id/delete', param, device, async (c) => {
  await deleteCard(createDb(c.env.DB), Number(c.req.valid('param').id), c.req.valid('json').deviceId);
  return c.json({ success: true, data: null });
});

cardWalletRoute.post('/cards/:id/movements/:movementId', tbValidator('param', movementParamSchema, refuseInvalid), device, async (c) => {
  const { id, movementId } = c.req.valid('param');
  const data = await getMovement(createDb(c.env.DB), Number(id), c.req.valid('json').deviceId, Number(movementId));
  return c.json({ success: true, data });
});
