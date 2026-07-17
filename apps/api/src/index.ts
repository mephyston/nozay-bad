// deploy: 2026-07-18-3
import { Hono } from 'hono';
import { membersRouter } from '@metacult/features-members-api';
import { accountingRouter } from '@metacult/features-accounting-api';
import { expensesRouter } from '@metacult/features-expenses-api';
import { shopRouter } from '@metacult/features-shop-api';
import { AppError } from '@metacult/shared-db';

type Bindings = {
  DB: D1Database;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

app.onError((err, c) => {
  if (err instanceof AppError || (err && (err as any).name === 'AppError')) {
    return c.json({ success: false, error: err.message }, (err as any).status || 400);
  }
  console.error({ url: c.req.url, err: err?.message || String(err), stack: err?.stack });
  return c.json({ success: false, error: 'Erreur interne du serveur' }, 500);
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
