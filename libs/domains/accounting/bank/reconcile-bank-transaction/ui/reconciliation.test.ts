import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReconciliationState, type BankTransaction, type GLTransaction } from './reconciliation.svelte';

describe('createReconciliationState logic unit tests', () => {
  const originalFetch = globalThis.fetch;

  const mockBankTransactions: BankTransaction[] = [
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
      bankTransactionId: null
    },
    {
      id: 11,
      type: 'recette',
      accountId: 'current',
      amount: 15000,
      date: '2026-03-02',
      description: 'Adhesion Dupont',
      category: '1',
      bankTransactionId: 99
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
      bankTransactions: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    // Default tab is 'pending'
    expect(state.displayedTransactions.length).toBe(2);
    expect(state.displayedTransactions.map(t => t.id)).toEqual([1, 2]);

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
      bankTransactions: mockBankTransactions,
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
      bankTransactions: mockBankTransactions,
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
      bankTransactions: mockBankTransactions,
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
      bankTransactions: mockBankTransactions,
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
      bankTransactions: mockBankTransactions,
      glTransactions: mockGlTransactions,
      seasonId: '25-26',
      seasons: [{ id: '25-26', name: '2025-2026', active: true }],
      members: []
    });

    // Transaction 1 (-5000, depense) matches GL entry 10 (-5000, depense, unlinked)
    const sug1 = state.getSuggestions(mockBankTransactions[0]);
    expect(sug1.length).toBe(1);
    expect(sug1[0].id).toBe(10);

    // Transaction 2 (15000, recette) matches GL entry 11 (15000, recette), but entry 11 has bankTransactionId=99 so excluded
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
      bankTransactions: mockBankTransactions,
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
      bankTransactions: mockBankTransactions,
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
});
