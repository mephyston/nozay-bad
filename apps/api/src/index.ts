import { Hono } from 'hono';
import { membersRouter } from '@nba/members-api';
import { accountingRouter } from '@nba/accounting-api';
import { expensesRouter } from '@nba/expenses-api';
import { shopRouter } from '@nba/shop-api';
import { AppError } from '@nba/db';

type Bindings = {
  DB: D1Database;
  AI: any;
  INTERNAL_API_KEY?: string;
  CATALOG_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.onError((err, c) => {
  if (err instanceof AppError || (err && (err as any).name === 'AppError')) {
    return c.json({ success: false, error: err.message }, (err as any).status || 400);
  }
  console.error({ url: c.req.url, err: err?.message || String(err), stack: err?.stack });
  return c.json({ success: false, error: 'Erreur interne du serveur' }, 500);
});

// Middleware d'authentification et de défense en profondeur
app.use('*', async (c, next) => {
  if (c.req.path === '/health') {
    return next();
  }

  const apiKey = c.env?.INTERNAL_API_KEY || c.env?.CATALOG_API_KEY;
  const reqKey =
    c.req.header('x-api-key') ||
    c.req.header('x-internal-secret') ||
    c.req.header('authorization')?.replace(/^Bearer\s+/i, '');

  // 1. Clé d'API valide fournie en en-tête
  if (apiKey && reqKey === apiKey) {
    return next();
  }

  // 2. Détection des appels internes via Service Binding (requêtes internes sur localhost sans cf-connecting-ip)
  const url = new URL(c.req.url);
  const isServiceBinding =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    !c.req.header('cf-connecting-ip');

  if (isServiceBinding) {
    return next();
  }

  // 3. Rejet des requêtes externes directes non authentifiées
  return c.json({ success: false, error: 'Accès non autorisé' }, 401);
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Mount routers
app.route('/members', membersRouter);
app.route('/accounting', accountingRouter);
app.route('/expenses', expensesRouter);
app.route('/shop', shopRouter);

export default app;
