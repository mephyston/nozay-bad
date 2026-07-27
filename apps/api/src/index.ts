import { Hono } from 'hono';
import { membersRouter } from '@nba/members-api';
import { accountingRouter } from '@nba/accounting-api';
import { expensesRouter } from '@nba/expenses-api';
import { shopRouter } from '@nba/shop-api';
import { dashboardRouter } from './dashboard';
import { AppError } from '@nba/db';

type Bindings = {
  DB: D1Database;
  AI: any;
  INTERNAL_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.onError((err, c) => {
  if (err instanceof AppError || (err && (err as any).name === 'AppError')) {
    return c.json({ success: false, error: err.message }, (err as any).status || 400);
  }
  console.error({ url: c.req.url, err: err?.message || String(err), stack: err?.stack });
  return c.json({ success: false, error: 'Erreur interne du serveur' }, 500);
});

// Middleware d'authentification stricte par clé d'API partagée
app.use('*', async (c, next) => {
  if (c.req.path === '/health') {
    return next();
  }

  const apiKey =
    c.env?.INTERNAL_API_KEY ||
    (process.env.NODE_ENV === 'development' ? 'dev-secret-key-12345' : '');

  // Échec en fermeture : clé non configurée sur le Worker
  if (!apiKey) {
    console.error('INTERNAL_API_KEY is not configured in worker environment');
    return c.json({ success: false, error: 'Erreur de configuration serveur' }, 500);
  }

  const reqKey =
    c.req.header('x-api-key') ||
    c.req.header('x-internal-secret') ||
    c.req.header('authorization')?.replace(/^Bearer\s+/i, '');

  if (reqKey === apiKey) {
    return next();
  }

  console.error(`401 Unauthorized. reqKey: '${reqKey}', expected: '${apiKey}', path: ${c.req.path}`);
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
app.route('/dashboard', dashboardRouter);

export default app;
