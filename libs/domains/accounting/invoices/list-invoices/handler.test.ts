import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listInvoices } from './handler';
import { ListInvoicesRepository } from './repository';

vi.mock('./repository');

function mockRepo(over: Record<string, any> = {}) {
  const instance = {
    list: vi.fn().mockResolvedValue([]),
    listCategoryBreakdown: vi.fn().mockResolvedValue(new Map()),
    ...over
  };
  (vi.mocked(ListInvoicesRepository) as any).mockImplementation(function () { return instance; });
  return instance;
}

describe('listInvoices', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it("liste les factures de l'exercice demandé", async () => {
    const repo = mockRepo({ list: vi.fn().mockResolvedValue([{ id: 1, totalAmountCents: 15600 }]) });

    const result = await listInvoices(db, { seasonId: '25-26' } as any);

    expect(repo.list).toHaveBeenCalledWith(db, { seasonId: '25-26' });
    expect(result).toHaveLength(1);
  });

  /*
    L'imputation vient des lignes de facture, et non plus d'un `category: '1'` codé en dur au
    rapprochement — qui envoyait toute recette de facturation sous « Adhésions & Inscriptions ».
  */
  it("attache à chaque facture l'imputation de ce qu'elle encaissera", async () => {
    const repo = mockRepo({
      list: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      listCategoryBreakdown: vi.fn().mockResolvedValue(new Map([
        [1, [{ categoryId: 7, amountCents: 15600 }]],
        [2, [{ categoryId: 3, amountCents: 4000 }, { categoryId: 9, amountCents: 1000 }]]
      ]))
    });

    const [first, second] = await listInvoices(db, { seasonId: '25-26' } as any);

    expect(repo.listCategoryBreakdown).toHaveBeenCalledWith(db, [1, 2]);
    expect(first.categoryBreakdown).toEqual([{ categoryId: 7, amountCents: 15600 }]);
    // Une facture qui mêle deux catégories donne deux parts — donc une ventilation.
    expect(second.categoryBreakdown).toHaveLength(2);
  });

  it("rend une ventilation vide pour une facture sans ligne catégorisée", async () => {
    mockRepo({ list: vi.fn().mockResolvedValue([{ id: 1 }]) });

    const [invoice] = await listInvoices(db, { seasonId: '25-26' } as any);

    expect(invoice.categoryBreakdown).toEqual([]);
  });

  it('laisse remonter une erreur de lecture', async () => {
    mockRepo({ list: vi.fn().mockRejectedValue(new Error('Business error')) });

    await expect(listInvoices(db, { seasonId: '25-26' } as any)).rejects.toThrow();
  });
});
