
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileBankStatementLine } from './handler';
import { ReconcileBankStatementLineRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
import { assertMembershipMatchesSeason } from '../../shared/member-season';
vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn()
}));
vi.mock('./repository');
vi.mock('@nba/accounting-api', () => ({ normalizeCategory: vi.fn().mockReturnValue(1) }));
/* Le contrôle d'exercice a son propre banc d'essai (`shared/member-season.test.ts`) et lit la
   base ; ici on vérifie seulement que « Associer » le franchit, avec l'exercice de l'écriture
   cible et non celui de l'écran. */
vi.mock('../../shared/member-season', () => ({ assertMembershipMatchesSeason: vi.fn() }));


describe('reconcileBankStatementLine', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = { batch: vi.fn().mockResolvedValue([]) };
  });
  it('should execute successfully', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getBankStatementLineById: vi.fn().mockResolvedValue({ id: 1, amount: 10, status: 'pending', date: '2023-01-01', label: 'test' }),
      getTransactionById: vi.fn().mockResolvedValue({ seasonId: '23-24', amount: 10, category: 1 }),
      buildLinkTransactionToBankStatement: vi.fn().mockReturnValue('stmt1'),
      getLedgerEntriesForBankStatementLine: vi.fn().mockResolvedValue([{ amount: 10 }]),
      getLinkedLedgerEntriesForUi: vi.fn().mockResolvedValue([{ id: 42, amount: 10, bankStatementLineId: 1 }]),
      buildMarkBankStatementLineReconciledStatement: vi.fn().mockReturnValue('stmt2'),
    };
    (vi.mocked(ReconcileBankStatementLineRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    const payload = { action: 'match', ledgerEntryId: 1, memberId: 1 };
    await (reconcileBankStatementLine as any)(db, 1, payload);
    expect(db.batch).toHaveBeenCalled();
    expect(assertMembershipMatchesSeason).toHaveBeenCalledWith(db, 1, '23-24');
  });
  it('should throw error', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getBankStatementLineById: vi.fn().mockRejectedValue(new Error('err')),
    };
    (vi.mocked(ReconcileBankStatementLineRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await expect((reconcileBankStatementLine as any)(db, 1, {})).rejects.toThrow();
  });
});
