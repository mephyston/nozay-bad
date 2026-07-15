import { Hono } from 'hono';
import { membersRouter } from '@metacult/features-members-api';
import { accountingRouter } from '@metacult/features-accounting-api';
import { expensesRouter } from '@metacult/features-expenses-api';
import { shopRouter } from '@metacult/features-shop-api';

type Bindings = {
  DB: D1Database;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Mount routers
app.route('/members', membersRouter);
app.route('/accounting', accountingRouter);
app.route('/expenses', expensesRouter);
app.route('/shop', shopRouter);

export default app;
