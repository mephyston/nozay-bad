import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckDeposit, depositCheckDeposit, clearCheckDeposit, deleteCheckDeposit } from './handler';
import { AppError } from '@nba/db';

/** Un statement drizzle factice, accepté par `db.batch`, étiqueté pour lire l'ordre du batch. */
const stmt = (label: string) => ({ label, _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (r: any) => r }) });

const repo = vi.hoisted(() => ({
  resolveSeasonId: vi.fn(),
  getChecksByIds: vi.fn(),
  getChecksByDepositId: vi.fn(),
  getBankStatementLineById: vi.fn(),
  createCheckDeposit: vi.fn(),
  updateChecksDeposit: vi.fn(),
  getCheckDepositById: vi.fn(),
  buildUpdateCheckDepositStatement: vi.fn(),
  buildUpdateChecksStatusForDepositStatement: vi.fn(),
  buildPointLedgerEntriesStatement: vi.fn(),
  buildUnpointLedgerEntriesStatement: vi.fn(),
  buildUpdateBankStatementLineStatusStatement: vi.fn(),
  buildUnlinkChecksForDepositStatement: vi.fn(),
  buildDeleteCheckDepositStatement: vi.fn()
}));

vi.mock('./repository', () => ({
  CreateBankCheckDepositRepository: class {
    constructor() {
      return repo;
    }
  }
}));

const mockDb = { batch: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  repo.resolveSeasonId.mockResolvedValue(1);
  repo.getChecksByIds.mockResolvedValue([
    { id: 1, amountCents: 6200, number: '111', seasonId: 1, status: 'received', checkDepositId: null, ledgerEntryId: 781 },
    { id: 2, amountCents: 18600, number: '222', seasonId: 1, status: 'received', checkDepositId: null, ledgerEntryId: 784 }
  ]);
  repo.getChecksByDepositId.mockResolvedValue([
    { id: 1, ledgerEntryId: 781 }, { id: 2, ledgerEntryId: 784 }, { id: 3, ledgerEntryId: null }
  ]);
  repo.getBankStatementLineById.mockResolvedValue({ id: 999, amountCents: 24800, status: 'pending' });
  repo.createCheckDeposit.mockResolvedValue({ id: 2 });
  repo.getCheckDepositById.mockResolvedValue({ id: 2, status: 'deposited', amountCents: 24800, amount: 24800, bankStatementLineId: null });
  repo.buildUpdateCheckDepositStatement.mockReturnValue(stmt('update-deposit'));
  repo.buildUpdateChecksStatusForDepositStatement.mockReturnValue(stmt('update-checks-status'));
  repo.buildPointLedgerEntriesStatement.mockReturnValue(stmt('point-entries'));
  repo.buildUnpointLedgerEntriesStatement.mockReturnValue(stmt('unpoint-entries'));
  repo.buildUpdateBankStatementLineStatusStatement.mockReturnValue(stmt('update-line'));
  repo.buildUnlinkChecksForDepositStatement.mockReturnValue(stmt('unlink-checks'));
  repo.buildDeleteCheckDepositStatement.mockReturnValue(stmt('delete-deposit'));
  mockDb.batch.mockResolvedValue([]);
});

const labels = () => mockDb.batch.mock.calls[0][0].map((s: any) => s.label);

describe('createCheckDeposit', () => {
  /*
   * Le bordereau s'imprime avant d'aller à la banque : la remise naît « à déposer », et ses
   * chèques restent au coffre jusqu'à la confirmation du dépôt.
   */
  it("naît « à déposer », les chèques restant reçus", async () => {
    const result = await createCheckDeposit(mockDb as any, {
      seasonId: '26-27', reference: 'REMISE-1', date: '2026-09-07', checkIds: [1, 2]
    });

    expect(result.id).toBe(2);
    expect(repo.createCheckDeposit).toHaveBeenCalledWith(mockDb, expect.objectContaining({ status: 'pending', amountCents: 24800 }));
    expect(repo.updateChecksDeposit).toHaveBeenCalledWith(mockDb, [1, 2], 2, 'received');
  });

  it('refuse un chèque déjà inscrit sur une autre remise', async () => {
    repo.getChecksByIds.mockResolvedValue([
      { id: 1, amountCents: 6200, number: '111', seasonId: 1, status: 'received', checkDepositId: 7 }
    ]);

    await expect(createCheckDeposit(mockDb as any, {
      seasonId: '26-27', reference: 'REMISE-1', date: '2026-09-07', checkIds: [1]
    })).rejects.toMatchObject({ status: 400, message: expect.stringContaining('111') });
    expect(repo.createCheckDeposit).not.toHaveBeenCalled();
  });

  it('should throw when checkIds empty', async () => {
    await expect(createCheckDeposit(mockDb as any, {
      seasonId: '2023', reference: 'REF1', date: '2023-01-01', checkIds: []
    })).rejects.toThrow(AppError);
  });
});

describe('depositCheckDeposit', () => {
  it('passe la remise et ses chèques « déposés », à la date confirmée', async () => {
    repo.getCheckDepositById.mockResolvedValue({ id: 2, status: 'pending', amountCents: 24800 });

    await depositCheckDeposit(mockDb as any, 2, { date: '2026-09-09' });

    expect(repo.buildUpdateCheckDepositStatement).toHaveBeenCalledWith(mockDb, 2, { status: 'deposited', date: '2026-09-09' });
    expect(repo.buildUpdateChecksStatusForDepositStatement).toHaveBeenCalledWith(mockDb, 2, 'deposited');
    expect(labels()).toEqual(['update-deposit', 'update-checks-status']);
  });

  it('garde la date prévue quand rien ne la remplace', async () => {
    repo.getCheckDepositById.mockResolvedValue({ id: 2, status: 'pending', amountCents: 24800 });

    await depositCheckDeposit(mockDb as any, 2);

    expect(repo.buildUpdateCheckDepositStatement).toHaveBeenCalledWith(mockDb, 2, { status: 'deposited' });
  });

  it('refuse une remise déjà déposée', async () => {
    await expect(depositCheckDeposit(mockDb as any, 2)).rejects.toMatchObject({ status: 400 });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it('renvoie 404 pour une remise inconnue', async () => {
    repo.getCheckDepositById.mockResolvedValue(undefined);
    await expect(depositCheckDeposit(mockDb as any, 99)).rejects.toMatchObject({ status: 404 });
  });
});

describe('clearCheckDeposit', () => {
  /*
   * Ce qui manquait : la ligne était « rapprochée » avec une couverture nulle et les recettes
   * restaient non pointées à jamais — un écart du montant de la remise, que rien ne nommait.
   */
  it('pointe les recettes des chèques sur la ligne, en plus de la remise et de la ligne', async () => {
    await clearCheckDeposit(mockDb as any, 2, { bankStatementLineId: 999 });

    expect(repo.buildUpdateCheckDepositStatement).toHaveBeenCalledWith(mockDb, 2, { status: 'cleared', bankStatementLineId: 999 });
    // Le chèque orphelin (sans recette) est ignoré, pas planté.
    expect(repo.buildPointLedgerEntriesStatement).toHaveBeenCalledWith(mockDb, [781, 784], 999);
    expect(repo.buildUpdateBankStatementLineStatusStatement).toHaveBeenCalledWith(mockDb, 999, 'reconciled');
    expect(labels()).toEqual(['update-deposit', 'point-entries', 'update-line']);
  });

  it("refuse une remise encore « à déposer »", async () => {
    repo.getCheckDepositById.mockResolvedValue({ id: 2, status: 'pending', amountCents: 24800 });

    await expect(clearCheckDeposit(mockDb as any, 2, { bankStatementLineId: 999 }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining("Confirmez d'abord") });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("refuse une ligne d'un autre montant : une remise est une seule opération bancaire", async () => {
    repo.getBankStatementLineById.mockResolvedValue({ id: 999, amountCents: 18600, status: 'pending' });

    await expect(clearCheckDeposit(mockDb as any, 2, { bankStatementLineId: 999 }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining('186.00') });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it('refuse une ligne déjà rapprochée et une remise déjà encaissée', async () => {
    repo.getBankStatementLineById.mockResolvedValue({ id: 999, amountCents: 24800, status: 'reconciled' });
    await expect(clearCheckDeposit(mockDb as any, 2, { bankStatementLineId: 999 })).rejects.toMatchObject({ status: 400 });

    repo.getCheckDepositById.mockResolvedValue({ id: 2, status: 'cleared', amountCents: 24800 });
    await expect(clearCheckDeposit(mockDb as any, 2, { bankStatementLineId: 999 })).rejects.toMatchObject({ status: 400 });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });
});

describe('deleteCheckDeposit', () => {
  it("défait une remise encaissée : recettes dépointées, ligne remise en attente, chèques libérés", async () => {
    repo.getCheckDepositById.mockResolvedValue({ id: 2, status: 'cleared', amountCents: 24800, bankStatementLineId: 999 });

    await deleteCheckDeposit(mockDb as any, 2);

    expect(repo.buildUnpointLedgerEntriesStatement).toHaveBeenCalledWith(mockDb, [781, 784], 999);
    expect(labels()).toEqual(['unpoint-entries', 'update-line', 'unlink-checks', 'delete-deposit']);
  });

  it("libère seulement les chèques d'une remise à déposer", async () => {
    repo.getCheckDepositById.mockResolvedValue({ id: 2, status: 'pending', amountCents: 24800, bankStatementLineId: null });

    await deleteCheckDeposit(mockDb as any, 2);

    expect(repo.getChecksByDepositId).not.toHaveBeenCalled();
    expect(labels()).toEqual(['unlink-checks', 'delete-deposit']);
  });
});
