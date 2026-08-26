import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReconciliationState, type BankStatementLine, type GLTransaction } from './reconciliation.svelte';

describe('createReconciliationState logic unit tests', () => {
  const originalFetch = globalThis.fetch;

  const mockBankTransactions: BankStatementLine[] = [
    {
      id: 1,
      fitid: 'FIT-1',
      accountId: 'current',
      amount: -5000,
      date: '2026-03-01',
      name: 'ACHAT MATERIEL BADMINTON',
      memo: 'Note de frais 123',
      status: 'pending',
      aiSuggestions: JSON.stringify({ category: 10, memberId: 42, confidence: 0.95 })
    },
    {
      id: 2,
      fitid: 'FIT-2',
      accountId: 'current',
      amount: 15000,
      date: '2026-03-02',
      name: 'VIREMENT ADHESION DUPONT',
      memo: 'Cotisation 2026',
      status: 'pending',
      aiSuggestions: null
    },
    {
      id: 3,
      fitid: 'FIT-3',
      accountId: 'current',
      amount: 2500,
      date: '2026-03-03',
      name: 'REMPLACEMENT CORDAGE',
      memo: 'Service',
      status: 'reconciled',
      aiSuggestions: null
    }
  ];

  const mockGlTransactions: GLTransaction[] = [
    {
      id: 10,
      type: 'depense',
      accountId: 'current',
      amount: -5000,
      date: '2026-03-01',
      description: 'Achat materiel',
      category: '10',
      bankStatementLineId: null
    },
    {
      id: 11,
      type: 'recette',
      accountId: 'current',
      amount: 15000,
      date: '2026-03-02',
      description: 'Adhesion Dupont',
      category: '1',
      bankStatementLineId: 99
    }
  ];

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('filters displayed transactions by activeTab and search query', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    // Default tab is 'pending'
    expect(state.displayedTransactions.length).toBe(2);
    expect(state.displayedTransactions.map((t: any) => t.id)).toEqual([1, 2]);

    // Search query filtering
    state.searchQuery = 'dupont';
    expect(state.displayedTransactions.length).toBe(1);
    expect(state.displayedTransactions[0].id).toBe(2);

    state.searchQuery = '';
    state.activeTab = 'reconciled';
    expect(state.displayedTransactions.length).toBe(1);
    expect(state.displayedTransactions[0].id).toBe(3);
  });

  it('calculates counts correctly by status', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    expect(state.pendingCount).toBe(2);
    expect(state.reconciledCount).toBe(1);
    expect(state.ignoredCount).toBe(0);
  });

  it('toggles selection all displayed transactions', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    expect(state.selectedCount).toBe(0);
    state.toggleSelectAll(state.displayedTransactions);
    expect(state.selectedCount).toBe(2);

    state.toggleSelectAll(state.displayedTransactions);
    expect(state.selectedCount).toBe(0);
  });

  it('manages invoice selection and calculates selected sum', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    state.unpaidInvoices = [
      { id: 101, invoiceNumber: 'FAC-1', seasonId: '25-26', date: '2026-03-01', dueDate: '2026-04-01', clientName: 'A', clientAddress: null, clientEmail: null, subject: null, location: null, period: null, attendees: null, status: 'sent', totalAmount: 10000, createdAt: '2026-03-01' },
      { id: 102, invoiceNumber: 'FAC-2', seasonId: '25-26', date: '2026-03-01', dueDate: '2026-04-01', clientName: 'B', clientAddress: null, clientEmail: null, subject: null, location: null, period: null, attendees: null, status: 'sent', totalAmount: 5000, createdAt: '2026-03-01' }
    ];

    expect(state.selectedSum).toBe(0);
    state.toggleInvoiceSelection(101);
    expect(state.selectedSum).toBe(10000);
    state.toggleInvoiceSelection(102);
    expect(state.selectedSum).toBe(15000);
    state.toggleInvoiceSelection(101);
    expect(state.selectedSum).toBe(5000);
  });

  it('manages split rows', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    expect(state.splits.length).toBe(0);
    state.addSplitRow();
    state.addSplitRow();
    state.addSplitRow();
    expect(state.splits.length).toBe(3);

    state.removeSplitRow(0);
    expect(state.splits.length).toBe(2);

    // Won't remove if length <= 2
    state.removeSplitRow(0);
    expect(state.splits.length).toBe(2);
  });

  it('finds suggestions from GL excluding already linked transactions', () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    // Transaction 1 (-5000, depense) matches GL entry 10 (-5000, depense, unlinked)
    const sug1 = state.getSuggestions(mockBankTransactions[0]);
    expect(sug1.length).toBe(1);
    expect(sug1[0].id).toBe(10);

    // Transaction 2 (15000, recette) matches GL entry 11 (15000, recette), but entry 11 has bankStatementLineId=99 so excluded
    const sug2 = state.getSuggestions(mockBankTransactions[1]);
    expect(sug2.length).toBe(0);
  });

  it('loads unpaid invoices via fetch API', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [
          { id: 201, invoiceNumber: 'FAC-201', seasonId: '25-26', status: 'sent', totalAmount: 12000 }
        ]
      })
    } as Response);

    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    await state.loadUnpaidInvoices();

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/accounting/import', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'get-unpaid-invoices', season: '25-26' })
    }));
    expect(state.unpaidInvoices.length).toBe(1);
    expect(state.unpaidInvoices[0].id).toBe(201);
  });

  it('handles bulk reconcile API call', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response);

    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    state.selectedTxIds[1] = true;
    await state.handleBulkReconcile();

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/accounting/import', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"action":"bulk"')
    }));
  });

  /**
   * Le formulaire unitaire passait à `handleCreateAndMatch` l'identifiant de l'adhérent,
   * alors qu'il attend une ligne bancaire. Un nombre étant « truthy », il écrasait
   * silencieusement la sélection : la requête partait vers
   * `/bank-transactions/undefined/reconcile` et revenait en 400, sans que rien ne
   * désigne la vraie cause.
   */
  it('rapproche la ligne sélectionnée, sans argument à passer', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response);

    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    state.selectedTx = mockBankTransactions[1];
    state.amountToLink = 150;
    await state.handleCreateAndMatch();

    /* On cherche l'appel de rapprochement, et non le dernier : la relecture de l'état de
       rapprochement suit désormais chaque écriture. */
    const body = vi.mocked(globalThis.fetch).mock.calls
      .map((call) => call?.[1]?.body as string | undefined)
      .filter((b): b is string => typeof b === 'string')
      .find((b) => b.includes('"action":"create"')) as string;
    expect(body).toContain('"btId":2');
    expect(body).not.toContain('"btId":null');
  });

  it('refuse un argument qui n’est pas une ligne bancaire', async () => {
    const state = createReconciliationState({
      bankStatementLines: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    state.selectedTx = mockBankTransactions[1];
    vi.mocked(globalThis.fetch).mockClear();

    // Un identifiant d'adhérent, tel que le formulaire l'envoyait par erreur.
    await (state.handleCreateAndMatch as (bt?: unknown) => Promise<void>)(42);

    // Rien ne part : mieux vaut un refus lisible qu'une URL malformée.
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(state.errorMsg).toContain('Aucune transaction bancaire');
  });

  describe('reprise de facture', () => {
    const invoice = (over: Record<string, any> = {}) => ({
      id: 101, invoiceNumber: 'FAC-2026-0001', seasonId: '25-26', date: '2026-02-15',
      dueDate: '2026-03-15', clientName: 'Mairie', clientAddress: null, clientEmail: null,
      subject: null, location: null, period: null, attendees: null, status: 'sent',
      totalAmount: 15000, createdAt: '2026-02-15', categoryBreakdown: [{ categoryId: 7, amountCents: 15000 }],
      ...over
    });

    function stateWithInvoices(invoices: any[]) {
      const state = createReconciliationState({
        bankStatementLines: mockBankTransactions,
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: '2025-2026', active: true }],
        members: []
      });
      state.unpaidInvoices = invoices;
      state.selectedTx = mockBankTransactions[1];
      return state;
    }

    /*
      Reprendre une facture remplit le formulaire ; l'ancienne version écrivait directement une
      recette avec `category: '1'` en dur, sans que personne n'ait pu la relire.
    */
    it("reprend l'imputation portée par la facture", () => {
      const state = stateWithInvoices([invoice()]);

      state.prefillFromInvoices([101]);

      expect(state.splits).toHaveLength(1);
      expect(state.splits[0]).toMatchObject({ category: '7', amount: 150, invoiceId: 101 });
      expect(state.splits[0].label).toContain('FAC-2026-0001');
      // Une part unique se saisit dans le formulaire simple.
      expect(state.isSplitMode).toBe(false);
      expect(state.category).toBe('7');
    });

    it('donne une part par facture, chacune portant la sienne', () => {
      const state = stateWithInvoices([
        invoice(),
        invoice({ id: 102, invoiceNumber: 'FAC-2026-0002', totalAmount: 5000, categoryBreakdown: [{ categoryId: 9, amountCents: 5000 }] })
      ]);

      state.prefillFromInvoices([101, 102]);

      expect(state.splits.map((r: any) => r.invoiceId)).toEqual([101, 102]);
      expect(state.splits.map((r: any) => r.category)).toEqual(['7', '9']);
      expect(state.isSplitMode).toBe(true);
    });

    it("ventile une facture qui mêle deux catégories", () => {
      const state = stateWithInvoices([
        invoice({ categoryBreakdown: [{ categoryId: 3, amountCents: 10000 }, { categoryId: 9, amountCents: 5000 }] })
      ]);

      state.prefillFromInvoices([101]);

      expect(state.splits).toHaveLength(2);
      expect(state.splits.map((r: any) => r.amount)).toEqual([100, 50]);
      // Les deux parts restent rattachées à la même facture.
      expect(state.splits.every((r: any) => r.invoiceId === 101)).toBe(true);
    });

    /* Une facture antérieure à la colonne n'a pas d'imputation : la comptable doit la choisir. */
    it("laisse la catégorie vide quand la facture n'en porte pas", () => {
      const state = stateWithInvoices([invoice({ categoryBreakdown: [] })]);

      state.prefillFromInvoices([101]);

      expect(state.splits).toHaveLength(1);
      expect(state.splits[0].category).toBe('');
      expect(state.splits[0].amount).toBe(150);
    });

    it("bascule sur l'onglet de saisie et n'écrit rien", () => {
      const state = stateWithInvoices([invoice()]);
      state.activeRightTab = 'ledger';

      state.prefillFromInvoices([101]);

      expect(state.activeRightTab).toBe('manual');
      expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalledWith(
        '/admin/accounting/import',
        expect.objectContaining({ body: expect.stringContaining('"action":"create"') })
      );
    });

    it('ignore une reprise qui ne désigne aucune facture connue', () => {
      const state = stateWithInvoices([invoice()]);
      state.splits = [];

      state.prefillFromInvoices([999]);

      expect(state.splits).toEqual([]);
    });
  });

  describe("garde-fou d'imputation", () => {
    function stateFor(over: Record<string, any> = {}) {
      const state = createReconciliationState({
        bankStatementLines: mockBankTransactions,
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: '2025-2026', active: true }],
        members: []
      });
      state.selectedTx = mockBankTransactions[1];
      for (const [k, v] of Object.entries(over)) (state as any)[k] = v;
      return state;
    }

    /*
      Sans ce refus, le serveur retomberait sur la catégorie 1 — « Adhésions & Inscriptions » —
      et l'on aurait déplacé le défaut codé en dur d'un cran plus bas au lieu de le supprimer.
    */
    it('refuse de ventiler une part sans imputation, et la nomme', async () => {
      const state = stateFor({
        isSplitMode: true,
        splits: [{ category: '7', amount: 100 }, { category: '', amount: 50 }]
      });

      await state.handleCreateAndMatch();

      expect(state.errorMsg).toContain('part 2');
      expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalledWith(
        '/admin/accounting/import',
        expect.objectContaining({ body: expect.stringContaining('"action":"create"') })
      );
    });

    it("refuse une écriture unique sans imputation", async () => {
      const state = stateFor({ category: '', amountToLink: 150 });

      await state.handleCreateAndMatch();

      expect(state.errorMsg).toContain('catégorie');
    });
  });
});
