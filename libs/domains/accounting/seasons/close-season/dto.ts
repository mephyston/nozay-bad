import { seasonsTable } from '../../shared/schema';

export type CloseSeasonInput = string | {
  seasonId: string | number;
  confirmOverwriteInitialBalances?: boolean;
  copyBudgetsToNextSeason?: boolean;
};

export type CloseSeasonCheckItem = {
  code: 'BEFORE_END_DATE' | 'PENDING_BANK_TRANSACTIONS' | 'UNRESOLVED_CHECK_DEPOSITS' | 'UNCLAIMED_IN_VAULT_CHECKS' | 'PENDING_DEBIT_TRANSACTIONS' | 'CASH_DISCREPANCY';
  message: string;
  details?: any;
};

export type CloseSeasonCheckResult = {
  canClose: boolean;
  blockingItems: CloseSeasonCheckItem[];
  warnings: CloseSeasonCheckItem[];
  balancesToRollover: {
    accountId: number;
    accountCode: string;
    accountLabel: string;
    finalBalanceCents: number;
  }[];
  nextSeasonId?: number | null;
  nextSeasonCode?: string | null;
  existingInitialBalancesOnNextSeason?: {
    accountId: number;
    accountCode: string;
    existingBalanceCents: number;
    newBalanceCents: number;
    discrepancy: boolean;
  }[];
};

export type CloseSeasonOutput = {
  season: typeof seasonsTable.$inferSelect;
  rolledOverBalances: {
    accountId: number;
    accountCode: string;
    initialBalanceCents: number;
  }[];
  nextSeasonId?: number | null;
  budgetsCopied?: number;
};

export type ReopenSeasonInput = string | {
  seasonId: string | number;
  reason?: string;
};

export type ReopenSeasonOutput = {
  season: typeof seasonsTable.$inferSelect;
  cancelledRolloverCount: number;
};
