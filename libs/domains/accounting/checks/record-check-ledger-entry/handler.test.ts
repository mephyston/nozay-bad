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

/* La porte commune à toutes les écritures : ici on vérifie qu'elle est franchie, pas ce qu'elle juge. */
const validateAccrualAndFiscalPhase = vi.hoisted(() => vi.fn());
vi.mock('../../shared/accruals', () => ({ validateAccrualAndFiscalPhase }));

const mockDb = {
  batch: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  validateAccrualAndFiscalPhase.mockResolvedValue(undefined);
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

  /*
   * Cas réel du 05/09/2026 : la lecture IA de la photo a daté un chèque de 26-27 au
   * 2025-09-05. Rien ne le refusait, et l'état de rapprochement a porté 110,00 € d'écart
   * qu'aucune ligne n'expliquait. La date passe désormais par la même porte que le grand livre.
   */
  it("refuse un chèque daté hors des bornes de l'exercice", async () => {
    validateAccrualAndFiscalPhase.mockRejectedValue(
      new AppError("La date de l'écriture sort des bornes de l'exercice sélectionné.", 400)
    );

    await expect(createCheck(mockDb as any, {
      seasonId: '26-27', number: '1426684', amount: 11000, emitter: 'QUERE', date: '2025-09-05', memberId: 1352
    })).rejects.toMatchObject({ status: 400, message: expect.stringContaining('bornes') });

    expect(validateAccrualAndFiscalPhase).toHaveBeenCalledWith(mockDb, {
      seasonId: 1, type: 'recette', date: '2025-09-05', memberId: 1352
    });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("date la recette du jour quand le corps ne donne pas de date, et la soumet au contrôle", async () => {
    const aujourdHui = new Date().toISOString().split('T')[0];

    await createCheck(mockDb as any, { seasonId: '26-27', number: '1', amount: 100, emitter: 'X' });

    expect(validateAccrualAndFiscalPhase).toHaveBeenCalledWith(mockDb, expect.objectContaining({ date: aujourdHui, memberId: null }));
    expect(repo.buildCreateLedgerEntryStatement.mock.calls[0][1].date).toBe(aujourdHui);
  });

  /*
   * Un chèque naît en coffre : c'est ce que `payment_methods.default_entry_status` dit du mode
   * « chèque », et c'est de ce statut que le solde bancaire théorique déduit ce qui n'est pas
   * encore en banque. Ce chemin laissait le défaut de la table, `cleared`.
   */
  it('crée la recette en coffre (`in_vault`), pas encaissée', async () => {
    await createCheck(mockDb as any, { seasonId: '26-27', number: '1', amount: 100, emitter: 'X' });

    expect(repo.buildCreateLedgerEntryStatement.mock.calls[0][1]).toMatchObject({
      status: 'in_vault', paymentMethodId: 2, type: 'recette'
    });
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

  it("refuse un chèque inscrit sur une remise encore à déposer : son montant est figé dans le bordereau", async () => {
    repo.getCheckById.mockResolvedValue({ id: 1, seasonId: 1, status: 'received', checkDepositId: 5, ledgerEntryId: 10 });

    await expect(updateCheck(mockDb as any, 1, corps)).rejects.toMatchObject({ status: 400, message: expect.stringContaining('remise') });
    await expect(deleteCheck(mockDb as any, 1)).rejects.toMatchObject({ status: 400 });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it('refuse une recette déjà pointée sur le relevé', async () => {
    repo.getTransactionById.mockResolvedValue({ id: 10, categoryId: 1, bankStatementLineId: 42, description: '' });

    await expect(updateCheck(mockDb as any, 1, corps)).rejects.toMatchObject({ status: 400, message: expect.stringContaining('pointée') });
    expect(mockDb.batch).not.toHaveBeenCalled();
  });

  it("refuse une date hors des bornes de l'exercice du chèque", async () => {
    validateAccrualAndFiscalPhase.mockRejectedValue(new AppError('hors des bornes', 400));

    await expect(updateCheck(mockDb as any, 1, { ...corps, date: '2025-09-02' })).rejects.toMatchObject({ status: 400 });

    // L'exercice est celui du chèque existant, jamais celui que le corps pourrait prétendre.
    expect(validateAccrualAndFiscalPhase).toHaveBeenCalledWith(mockDb, {
      seasonId: 1, type: 'recette', date: '2025-09-02', memberId: null
    });
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
