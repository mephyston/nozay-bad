import { Hono } from 'hono';
import { listExpensesRoute } from './list/route';
import { createExpenseRoute } from './create/route';
import { updateExpenseRoute } from './update/route';
import { getAttachmentRoute } from './get/route';

export type Bindings = {
  DB: D1Database;
  AI: unknown;
};

export const expensesRouter = new Hono<{ Bindings: Bindings }>();

expensesRouter.route('/', listExpensesRoute);
expensesRouter.route('/', createExpenseRoute);
expensesRouter.route('/', updateExpenseRoute);
expensesRouter.route('/', getAttachmentRoute);

export { listExpenses, listAttachmentContents } from './list/handler';
export type { ExpenseSummary } from './list/dto';
export * from './shared/dashboard';
