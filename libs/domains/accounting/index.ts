import { paymentMethodsTable } from '@nba/accounting/schema';
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
import { exportSeasonRoute } from './seasons/export-season/route';

// Config Routes
import { listCategoriesRoute } from './config/list-categories/route';
import { listAccountClassesRoute } from './config/list-account-classes/route';
import { listAccountsRoute } from './config/list-accounts/route';
import { saveAccountRoute } from './config/save-account/route';
import { listPaymentMethodsRoute } from './config/list-payment-methods/route';
import { savePaymentMethodRoute } from './config/save-payment-method/route';
import { deletePaymentMethodRoute } from './config/delete-payment-method/route';
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
import { generateInvoiceRoute } from './invoices/generate-invoice/route';

// Bank Transactions Routes
import { listBankStatementLinesRoute } from './bank/list-bank-statement-lines/route';
import { importBankStatementRoute } from './bank/import-bank-statement/route';
import { analyzeBankStatementLinesRoute } from './bank/analyze-bank-statement-lines/route';
import { reconcileBankStatementLineRoute } from './bank/reconcile-bank-statement-line/route';
import { getReconciliationStatementRoute } from './bank/get-reconciliation-statement/route';

// Transactions Routes
import { listTransactionsRoute } from './ledger/list-ledger-entries/route';
import { createTransactionRoute } from './ledger/create-ledger-entry/route';
import { createInternalTransferRoute } from './ledger/create-internal-transfer/route';
import { updateInternalTransferRoute } from './ledger/update-internal-transfer/route';
import { updateTransactionRoute } from './ledger/update-ledger-entry/route';
import { deleteTransactionRoute } from './ledger/delete-ledger-entry/route';

// Checks Routes
import { listChecksRoute } from './checks/list-checks/route';
import { recordCheckTransactionRoute } from './checks/record-check-ledger-entry/route';
import { createBankCheckDepositRoute } from './checks/create-bank-check-deposit/route';
import { generateDepositSlipRoute } from './checks/generate-deposit-slip/route';

// AI Routes
import { generateAiAnalysisRoute } from './ai/generate-analysis/route';

export type Bindings = {
  DB: D1Database;
  AI: unknown;
};

export const accountingRouter = new Hono<{ Bindings: Bindings }>();

// Mount AI Routes
accountingRouter.route('/seasons', generateAiAnalysisRoute);

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
accountingRouter.route('/', exportSeasonRoute);

// 2. CONFIG ROUTES
accountingRouter.route('/', listCategoriesRoute);
accountingRouter.route('/', listAccountClassesRoute);
accountingRouter.route('/', listAccountsRoute);
accountingRouter.route('/', saveAccountRoute);
accountingRouter.route('/', listPaymentMethodsRoute);
accountingRouter.route('/', savePaymentMethodRoute);
accountingRouter.route('/', deletePaymentMethodRoute);
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
accountingRouter.route('/', generateInvoiceRoute);

// 4. BANK TRANSACTIONS ROUTES
accountingRouter.route('/', listBankStatementLinesRoute);
accountingRouter.route('/', importBankStatementRoute);
accountingRouter.route('/', analyzeBankStatementLinesRoute);
accountingRouter.route('/', reconcileBankStatementLineRoute);
accountingRouter.route('/', getReconciliationStatementRoute);

// 5. TRANSACTIONS ROUTES
accountingRouter.route('/', listTransactionsRoute);
accountingRouter.route('/', createTransactionRoute);
accountingRouter.route('/', createInternalTransferRoute);
accountingRouter.route('/', updateInternalTransferRoute);
accountingRouter.route('/', updateTransactionRoute);
accountingRouter.route('/', deleteTransactionRoute);

// 6. CHECKS & DEPOSITS ROUTES
accountingRouter.route('/', listChecksRoute);
accountingRouter.route('/', recordCheckTransactionRoute);
accountingRouter.route('/', createBankCheckDepositRoute);
accountingRouter.route('/', generateDepositSlipRoute);

export { normalizeCategory, cleanName } from './shared/helpers';
export { getSeasonReports } from './seasons/get-season-reports/handler';

import { CreateLedgerEntryRepository } from './ledger/create-ledger-entry/repository';
export { CreateLedgerEntryRepository };

import { DeleteTransactionRepository } from './ledger/delete-ledger-entry/repository';

/**
 * Une écriture, lue par un autre domaine qui l'a créée et veut la défaire.
 *
 * La boutique retire la recette d'une commande dont on annule l'encaissement. Elle ne
 * connaît de l'écriture que ce qu'il lui faut pour refuser à bon escient : l'exercice
 * et la ligne de relevé éventuellement pointée. Le schéma reste ici. La suppression,
 * elle, passe par `buildDeleteLedgerEntryStatement` (ledger/expenses), déjà exposé.
 */
export interface LedgerEntryRef {
  id: number;
  seasonId: number;
  bankStatementLineId: number | null;
}

export async function getLedgerEntryById(db: any, id: number): Promise<LedgerEntryRef | undefined> {
  const entry = await new DeleteTransactionRepository().getById(db, id);
  if (!entry) return undefined;
  return { id: entry.id, seasonId: entry.seasonId, bankStatementLineId: entry.bankStatementLineId ?? null };
}

import { sql, eq } from 'drizzle-orm';


export interface CreateRevenueTransactionParams {
  seasonId: number;
  paymentMethodId: number;
  amountCents: number;
  description: string;
  date: string;
  categoryId?: number | null;
  memberId?: number | null;
  reference?: string | null;
  accrualType?: string | null;
  accrualNote?: string | null;
}

export function buildCreateRevenueLedgerEntryStatement(db: any, params: CreateRevenueTransactionParams): any {
  const repository = new CreateLedgerEntryRepository();
  return repository.buildCreateStatement(db, {
    seasonId: params.seasonId,
    type: 'recette',
    accountId: sql`(SELECT default_account_id FROM payment_methods WHERE id = ${params.paymentMethodId})` as any,
    paymentMethodId: params.paymentMethodId,
    amountCents: params.amountCents,
    description: params.description,
    date: params.date,
    categoryId: params.categoryId ?? null,
    memberId: params.memberId ?? null,
    reference: params.reference ?? null,
    accrualType: params.accrualType ?? 'normal',
    accrualNote: params.accrualNote ?? null,
    status: sql`(SELECT default_entry_status FROM payment_methods WHERE id = ${params.paymentMethodId})` as any,
    createdAt: new Date()
  });
}

export async function createRevenueLedgerEntry(db: any, params: CreateRevenueTransactionParams): Promise<{ id: number }> {
  const method = await db.select({
    accountId: paymentMethodsTable.defaultAccountId,
    status: paymentMethodsTable.defaultEntryStatus
  }).from(paymentMethodsTable).where(eq(paymentMethodsTable.id, params.paymentMethodId)).get();

  const accountId = method?.accountId ?? 1;
  const status = (method?.status as any) || 'cleared';

  const repository = new CreateLedgerEntryRepository();
  return repository.create(db, {
    seasonId: params.seasonId,
    type: 'recette',
    accountId,
    paymentMethodId: params.paymentMethodId,
    amountCents: params.amountCents,
    description: params.description,
    date: params.date,
    categoryId: params.categoryId ?? null,
    memberId: params.memberId ?? null,
    reference: params.reference ?? null,
    accrualType: params.accrualType ?? 'normal',
    accrualNote: params.accrualNote ?? null,
    status,
    createdAt: new Date()
  });
}


export { 
  buildDeleteLedgerEntryStatement,
  buildResetBankStatementLineStatement,
  getTransactionDetails,
  getBankTransactionDetails,
  getRemainingTransactionsForBankTx,
  buildInsertExpenseTransactionStatement,
  insertExpenseTransaction,
  resetBankTransactionStatus,
  deleteLedgerEntry
} from './ledger/expenses';
export { getMemberLastPaymentTransaction, getMemberTotalPayments } from './ledger/members-queries';
export { getAccountByCode, getPaymentMethodById, getPaymentMethodByCode, listPaymentMethods } from './config/queries';
export { getSeasonId, isSeasonClosed, insertSeasons, getSeasonsByCodes, getSeasonByCode, getAllSeasons, getSeasonById, getActiveSeasonId, getSeasonAtDate, getAdjacentSeason, type SeasonRow } from './seasons/queries';
export * from './shared/dashboard';
