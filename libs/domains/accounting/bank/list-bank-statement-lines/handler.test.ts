import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listBankStatementLines } from './handler';
import { ListBankStatementLinesRepository } from './repository';
import { getSeasonFromDb } from '../../shared/accruals';
import { resolveAccountId } from '../../config/queries';

vi.mock('./repository');
vi.mock('../../shared/accruals', () => ({ getSeasonFromDb: vi.fn() }));
vi.mock('../../config/queries', () => ({ resolveAccountId: vi.fn() }));

const SEASON = { id: 1, code: '25-26', startDate: '2025-09-01', endDate: '2026-08-31' };

function mockRepo(rows: any[] = []) {
  const instance = { listBankStatementLines: vi.fn().mockResolvedValue(rows) };
  (vi.mocked(ListBankStatementLinesRepository) as any).mockImplementation(function () { return instance; });
  return instance;
}

describe('listBankStatementLines', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
    vi.mocked(getSeasonFromDb).mockResolvedValue(SEASON as any);
    vi.mocked(resolveAccountId).mockResolvedValue(7);
  });

  it("borne la requête à l'exercice demandé", async () => {
    const repo = mockRepo([{ id: 1, name: 'Tx 1', amountCents: 1500 }]);

    const result = await listBankStatementLines(db, { seasonId: '25-26' });

    expect(result).toHaveLength(1);
    expect(repo.listBankStatementLines).toHaveBeenCalledWith(db, expect.objectContaining({
      startDate: '2025-09-01',
      endDate: '2026-08-31'
    }));
  });

  it('refuse un exercice introuvable plutôt que de tout renvoyer', async () => {
    mockRepo();
    vi.mocked(getSeasonFromDb).mockResolvedValue(undefined as any);

    await expect(listBankStatementLines(db, { seasonId: 'inconnue' }))
      .rejects.toThrow('Saison comptable introuvable.');
  });

  it('applique le statut et le compte rangés sous `filters`', async () => {
    const repo = mockRepo();

    await listBankStatementLines(db, {
      seasonId: '25-26',
      filters: { status: 'pending', accountId: 'current' }
    });

    expect(resolveAccountId).toHaveBeenCalledWith(db, 'current');
    expect(repo.listBankStatementLines).toHaveBeenCalledWith(db, expect.objectContaining({
      status: 'pending',
      accountId: 7
    }));
  });

  it('accepte aussi les filtres posés à la racine', async () => {
    const repo = mockRepo();

    await listBankStatementLines(db, { seasonId: '25-26', status: 'reconciled' });

    expect(repo.listBankStatementLines).toHaveBeenCalledWith(db, expect.objectContaining({ status: 'reconciled' }));
  });

  it("laisse un intervalle explicite resserrer l'exercice", async () => {
    const repo = mockRepo();

    await listBankStatementLines(db, {
      seasonId: '25-26',
      filters: { startDate: '2025-10-01', endDate: '2025-10-31' }
    });

    expect(repo.listBankStatementLines).toHaveBeenCalledWith(db, expect.objectContaining({
      startDate: '2025-10-01',
      endDate: '2025-10-31'
    }));
  });

  it('ne résout aucun compte quand le filtre est absent', async () => {
    const repo = mockRepo();

    await listBankStatementLines(db, { seasonId: '25-26' });

    expect(resolveAccountId).not.toHaveBeenCalled();
    expect(repo.listBankStatementLines).toHaveBeenCalledWith(db, expect.objectContaining({ accountId: undefined }));
  });

  it('expose le montant sous ses deux noms', async () => {
    mockRepo([{ id: 1, amountCents: -8840 }]);

    const [line] = await listBankStatementLines(db, { seasonId: '25-26' }) as any[];

    expect(line.amount).toBe(-8840);
    expect(line.amountCents).toBe(-8840);
  });

  it("ne borne aucune date quand aucun exercice n'est demandé", async () => {
    const repo = mockRepo();

    await listBankStatementLines(db, {} as any);

    expect(getSeasonFromDb).not.toHaveBeenCalled();
    expect(repo.listBankStatementLines).toHaveBeenCalledWith(db, expect.objectContaining({
      startDate: undefined,
      endDate: undefined
    }));
  });
  it('transmet la borne de lecture, en la convertissant', async () => {
    // La route ne rend que des chaînes ; le repository attend des nombres.
    const repo = mockRepo();

    await listBankStatementLines(db, { filters: { limit: '50', offset: '100' } } as any);

    expect(repo.listBankStatementLines).toHaveBeenCalledWith(db, expect.objectContaining({
      limit: 50,
      offset: 100
    }));
  });

  it("ne borne rien quand aucune borne n'est demandée", async () => {
    /*
      `Number('')` vaut zéro, et une borne de zéro rendrait une liste vide sans qu'aucun
      appelant l'ait voulu : l'absence de borne doit rester l'absence de borne.
    */
    const repo = mockRepo();

    await listBankStatementLines(db, { filters: { limit: '', offset: '' } } as any);

    expect(repo.listBankStatementLines).toHaveBeenCalledWith(db, expect.objectContaining({
      limit: undefined,
      offset: undefined
    }));
  });
});
