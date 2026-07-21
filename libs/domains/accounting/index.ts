import { Hono } from 'hono';
import { seasonsRouter } from './routes/seasons';
import { transactionsRouter } from './routes/transactions';
import { bankRouter } from './routes/bank';
import { checksRouter, checkDepositsRouter } from './routes/checks';
import { configRouter } from './routes/config';
import { invoicesRouter } from './routes/invoices';

export type Bindings = {
  DB: D1Database;
  AI: any;
};

export const accountingRouter = new Hono<{ Bindings: Bindings }>();

// 1. SEASONS ROUTES
accountingRouter.route('/seasons', seasonsRouter);

// 2. TRANSACTIONS ROUTES
accountingRouter.route('/transactions', transactionsRouter);

// 3. BANK TRANSACTIONS ROUTES
accountingRouter.route('/bank-transactions', bankRouter);

// 4. CHECKS ROUTES
accountingRouter.route('/checks', checksRouter);

// 5. CHECK DEPOSITS ROUTES
accountingRouter.route('/check-deposits', checkDepositsRouter);

// 6. CONFIG (CATEGORIES & ACCOUNT-CLASSES) ROUTES
accountingRouter.route('/', configRouter);

// 7. INVOICES ROUTES
accountingRouter.route('/invoices', invoicesRouter);

export { normalizeCategory, cleanName } from './shared/helpers';
