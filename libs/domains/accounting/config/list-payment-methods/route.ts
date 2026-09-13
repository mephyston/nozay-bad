import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { listPaymentMethods, type ListPaymentMethodsOptions } from './handler';

export type Bindings = { DB: D1Database };

export const listPaymentMethodsRoute = new Hono<{ Bindings: Bindings }>();

/** `?offered=admin|storefront` restreint à ce qui se propose ; sans lui, tout, pour la configuration. */
listPaymentMethodsRoute.get('/payment-methods', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const offered = c.req.query('offered');
  const options: ListPaymentMethodsOptions = offered === 'admin' || offered === 'storefront' ? { offered } : {};
  // Un appelant de service (la boutique) ne voit jamais que ce qui est offert aux adhérents :
  // la liste complète, avec l'usage et les inactifs, est une donnée de configuration.
  const caller = c.req.header('x-caller');
  const effective = caller === 'storefront' || caller === 'website' ? { offered: 'storefront' as const } : options;
  return c.json({ success: true, data: await listPaymentMethods(createDb(c.env.DB), effective) });
});
