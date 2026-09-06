import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheck, deleteCheck, updateCheck } from './handler';
import { AppError } from '@nba/db';

/** Un statement drizzle factice, accepté par `db.batch`. */
const stmt = (label: string) => ({ label, _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (r: any) => r }) });

const repo = vi.hoisted(() => ({
  resolveSeasonId: vi.fn(),
  createLedgerEntry: vi.fn(),
  createCheck: vi.fn(),
  getCheckById: vi.fn(),
  getTransactionById: vi.fn(),
  unlinkCheckTransaction: vi.fn(),
  deleteLedgerEntry: vi.fn(),
  deleteCheck: vi.fn(),
  getAllMembers: vi.fn(),
  buildCreateLedgerEntryStatement: vi.fn(),
  buildCreateCheckStatement: vi.fn(),
  buildUpdateCheckStatement: vi.fn(),
  buildUpdateLedgerEntryStatement: vi.fn(),
  buildDeleteCheckStatement: vi.fn(),
  buildDeleteLedgerEntryStatement: vi.fn()
}));

vi.mock('./repository', () => ({
  RecordCheckTransactionRepository: class {
    constructor() {
      return repo;
    }
  }
}));

vi.mock('../../shared/helpers', () => ({
  cleanName: vi.fn((s) => s)
}));

const mockDb = {
  batch: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  repo.resolveSeasonId.mockResolvedValue(1);
  repo.getCheckById.mockResolvedValue({ id: 1, seasonId: 1, number: '123', emitter: 'TEST', status: 'received', ledgerEntryId: 10 });
  repo.getTransactionById.mockResolvedValue({ id: 10, amountCents: 100, memberId: null, categoryId: 1, bankStatementLineId: null, description: 'Règlement par chèque n°123 de TEST' });
  repo.getAllMembers.mockResolvedValue([]);
  repo.buildCreateLedgerEntryStatement.mockReturnValue(stmt('create-ledger'));
  repo.buildCreateCheckStatement.mockReturnValue(stmt('create-check'));
  repo.buildUpdateCheckStatement.mockReturnValue(stmt('update-check'));
  repo.buildUpdateLedgerEntryStatement.mockReturnValue(stmt('update-ledger'));
  repo.buildDeleteCheckStatement.mockReturnValue(stmt('delete-check'));
  repo.buildDeleteLedgerEntryStatement.mockReturnValue(stmt('delete-ledger'));
  mockDb.batch.mockResolvedValue([{ meta: { last_row_id: 10 } }, { meta: { last_row_id: 1 } }]);
});

describe('record-check-ledger-entry handler', () => {
  it('should create check successfully', async () => {
    const result = await createCheck(mockDb as any, {
      seasonId: '2023',
      number: '123',
      amount: 100,
      emitter: 'TEST'
    });
    expect(result.id).toBe(1);
  });

  it('should throw when creating check without required fields', async () => {
    await expect(createCheck(mockDb as any, { seasonId: '2023' } as any)).rejects.toThrow(AppError);
  });

  it('should delete check successfully', async () => {
    await expect(deleteCheck(mockDb as any, 1)).resolves.toBeUndefined();
  });
});

describe('updateCheck', () => {
  const corps = { number: '456', amount: 2500.4, emitter: 'DURAND', bank: 'LCL', category: '2', date: '2026-09-02' };

  it("corrige le chèque et la recette liée d'un seul batch", async () => {
    await updateCheck(mockDb as any, 1, corps);

    const statements = mockDb.batch.mock.calls[0][0];
    expect(statements.map((s: any) => s.label)).toEqual(['update-check', 'update-ledger']);

    expect(repo.buildUpdateCheckStatement).toHaveBeenCalledWith(mockDb, 1, {
      number: '456', amountCents: 2500, emitter: 'DURAND', bank: 'LCL', memberId: null
    });
    // Le libellé automatique suit le nouveau numéro et le nouvel émetteur.
    expect(repo.buildUpdateLedgerEntryStatement).toHaveBeenCalledWith(mockDb, 10, {
      amountCents: 2500, date: '2026-09-02', categoryId: 2, memberId: null,
      reference: 'Chèque n°456', description: 'Règlement par chèque n°456 de DURAND'
    });
  });

  it('conserve un libellé retouché depuis le grand livre', async () => {
    repo.getTransactionById.mockResolvedValue({ id: 10, categoryId: 1, bankStatementLineId: null, description: 'Cotisation famille Durand' });

    await updateCheck(mockDb as any, 1, corps);

    expect(repo.buildUpdateLedgerEntryStatement.mock.calls[0][2].description).toBe('Cotisation famille Durand');
  });

  it('garde la catégorie de la recette quand le corps ne la précise pas', async () => {
    repo.getTransactionById.mockResolvedValue({ id: 10, categoryId: 7, bankStatementLineId: null, description: '' });

    await updateCheck(mockDb as any, 1, { ...corps, category: undefined });

    expect(repo.buildUpdateLedgerEntryStatement.mock.calls[0][2].categoryId).toBe(7);
  });

  it("refuse un chèque déjà remis : son montant est figé dans le bordereau", async () => {
    repo.getCheckById.mockResolvedValue({ id: 1, seasonId: 1, status: 'deposited', ledgerEntryId: 10 });

    await expect(updateCheck(mockDb as any, 1, corps)).rejects.toMatchObject({ status: 400, message: expect.stringContaining('remis') });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it('refuse une recette déjà pointée sur le relevé', async () => {
    repo.getTransactionById.mockResolvedValue({ id: 10, categoryId: 1, bankStatementLineId: 42, description: '' });

    await expect(updateCheck(mockDb as any, 1, corps)).rejects.toMatchObject({ status: 400, message: expect.stringContaining('pointée') });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it('renvoie 404 pour un chèque inconnu', async () => {
    repo.getCheckById.mockResolvedValue(undefined);

    await expect(updateCheck(mockDb as any, 99, corps)).rejects.toMatchObject({ status: 404 });
  });

  it("ne touche que le chèque quand il n'a pas de recette liée", async () => {
    repo.getCheckById.mockResolvedValue({ id: 1, seasonId: 1, status: 'received', ledgerEntryId: null });

    await updateCheck(mockDb as any, 1, corps);

    expect(mockDb.batch.mock.calls[0][0].map((s: any) => s.label)).toEqual(['update-check']);
    expect(repo.getTransactionById).not.toHaveBeenCalled();
  });

  it('exige numéro, montant, émetteur et date', async () => {
    await expect(updateCheck(mockDb as any, 1, { ...corps, date: '' })).rejects.toThrow(AppError);
    expect(repo.getCheckById).not.toHaveBeenCalled();
  });
});
