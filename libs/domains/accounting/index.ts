import { Hono } from 'hono';

// Seasons Routes
import { listSeasonsRoute } from './seasons/list-seasons/route';
import { getSeasonBudgetRoute } from './seasons/get-season-budget/route';
import { getSeasonBalanceRoute } from './seasons/get-season-balance/route';
import { getSeasonBalancesRoute } from './seasons/get-season-balances/route';
import { getSeasonReportsRoute } from './seasons/get-season-reports/route';
import { createSeasonRoute } from './seasons/create-season/route';
import { updateSeasonRoute } from './seasons/update-season/route';
import { closeSeasonRoute } from './seasons/close-season/route';
import { updateSeasonBudgetRoute } from './seasons/update-season-budget/route';
import { updateSeasonBalancesRoute } from './seasons/update-season-balances/route';

// Config Routes
import { listCategoriesRoute } from './config/list-categories/route';
import { listAccountClassesRoute } from './config/list-account-classes/route';
import { createCategoryRoute } from './config/create-category/route';
import { updateCategoryRoute } from './config/update-category/route';
import { deleteCategoryRoute } from './config/delete-category/route';
import { createAccountClassRoute } from './config/create-account-class/route';
import { updateAccountClassRoute } from './config/update-account-class/route';
import { deleteAccountClassRoute } from './config/delete-account-class/route';

// Invoices Routes
import { listInvoicesRoute } from './invoices/list-invoices/route';
import { getInvoiceRoute } from './invoices/get-invoice/route';
import { createInvoiceRoute } from './invoices/create-invoice/route';
import { updateInvoiceRoute } from './invoices/update-invoice/route';
import { deleteInvoiceRoute } from './invoices/delete-invoice/route';
import { changeInvoiceStatusRoute } from './invoices/change-invoice-status/route';

// Bank Transactions Routes
import { listBankTransactionsRoute } from './bank/list-bank-transactions/route';
import { importBankStatementRoute } from './bank/import-bank-statement/route';
import { analyzeBankTransactionsRoute } from './bank/analyze-bank-transactions/route';
import { reconcileBankTransactionRoute } from './bank/reconcile-bank-transaction/route';
import { updateBankTransactionStatusRoute } from './bank/update-bank-transaction-status/route';

// Transactions Routes
import { listTransactionsRoute } from './transactions/list-transactions/route';
import { createTransactionRoute } from './transactions/create-transaction/route';
import { updateTransactionRoute } from './transactions/update-transaction/route';
import { deleteTransactionRoute } from './transactions/delete-transaction/route';

// Checks Routes
import { listChecksRoute } from './checks/list-checks/route';
import { recordCheckTransactionRoute } from './checks/record-check-transaction/route';
import { createBankCheckDepositRoute } from './checks/create-bank-check-deposit/route';

export type Bindings = {
  DB: D1Database;
  AI: unknown;
};

export const accountingRouter = new Hono<{ Bindings: Bindings }>();

// 1. SEASONS ROUTES (mounted with /seasons prefix)
accountingRouter.route('/seasons', listSeasonsRoute);
accountingRouter.route('/seasons', getSeasonBudgetRoute);
accountingRouter.route('/seasons', getSeasonBalanceRoute);
accountingRouter.route('/seasons', getSeasonBalancesRoute);
accountingRouter.route('/seasons', getSeasonReportsRoute);
accountingRouter.route('/seasons', createSeasonRoute);
accountingRouter.route('/seasons', updateSeasonRoute);
accountingRouter.route('/seasons', closeSeasonRoute);
accountingRouter.route('/seasons', updateSeasonBudgetRoute);
accountingRouter.route('/seasons', updateSeasonBalancesRoute);

// 2. CONFIG ROUTES
accountingRouter.route('/', listCategoriesRoute);
accountingRouter.route('/', listAccountClassesRoute);
accountingRouter.route('/', createCategoryRoute);
accountingRouter.route('/', updateCategoryRoute);
accountingRouter.route('/', deleteCategoryRoute);
accountingRouter.route('/', createAccountClassRoute);
accountingRouter.route('/', updateAccountClassRoute);
accountingRouter.route('/', deleteAccountClassRoute);

// 3. INVOICES ROUTES
accountingRouter.route('/', listInvoicesRoute);
accountingRouter.route('/', getInvoiceRoute);
accountingRouter.route('/', createInvoiceRoute);
accountingRouter.route('/', updateInvoiceRoute);
accountingRouter.route('/', deleteInvoiceRoute);
accountingRouter.route('/', changeInvoiceStatusRoute);

// 4. BANK TRANSACTIONS ROUTES
accountingRouter.route('/', listBankTransactionsRoute);
accountingRouter.route('/', importBankStatementRoute);
accountingRouter.route('/', analyzeBankTransactionsRoute);
accountingRouter.route('/', reconcileBankTransactionRoute);
accountingRouter.route('/', updateBankTransactionStatusRoute);

// 5. TRANSACTIONS ROUTES
accountingRouter.route('/', listTransactionsRoute);
accountingRouter.route('/', createTransactionRoute);
accountingRouter.route('/', updateTransactionRoute);
accountingRouter.route('/', deleteTransactionRoute);

// 6. CHECKS & DEPOSITS ROUTES
accountingRouter.route('/', listChecksRoute);
accountingRouter.route('/', recordCheckTransactionRoute);
accountingRouter.route('/', createBankCheckDepositRoute);

export { normalizeCategory, cleanName } from './shared/helpers';
