import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ExpensesManager from './ExpensesManager.svelte';

describe('ExpensesManager Component', () => {
  const seasons = [
    { id: '25-26', name: 'Saison 2025-2026', active: true },
    { id: '24-25', name: 'Saison 2024-2025', active: false }
  ];

  const categories = [
    { id: '10', code: 'materiel_club', adminLabel: 'Matériel (hors cordages)', adherentLabel: 'Matériel (hors cordages)', hideInExpenses: false }
  ];


  const expenses = [
    {
      id: 1,
      seasonId: '25-26',
      description: 'Achat de volants RSL',
      category: 'materiel_club',
      amount: 12000, // 120.00 €
      photoUrl: 'http://example.com/receipt.jpg',
      status: 'pending' as const,
      emitterName: 'Marie Curie',
      memberId: null,
      ledgerEntryId: null,
      createdAt: '2026-07-13T10:00:00.000Z'
    }
  ];

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as any)
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders pending expenses cards correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpensesManager, {
      target,
      props: {
        expenses,
        seasonId: '25-26',
        seasons,
        categories
      }
    });
    flushSync();

    expect(target.innerHTML).toContain('Marie Curie');
    expect(target.innerHTML).toContain('120.00 €');
    expect(target.innerHTML).toContain('Achat de volants RSL');
    expect(target.innerHTML).toContain('Matériel (hors cordages)');
    expect(target.innerHTML).toContain('Visualiser');
    expect(target.innerHTML).toContain('Modifier');
  });

  it('calls fetch on action click', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpensesManager, {
      target,
      props: {
        expenses,
        seasonId: '25-26',
        seasons,
        categories
      }
    });
    flushSync();

    const approveButton = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'Rembourser'
    );
    expect(approveButton).toBeDefined();

    approveButton?.click();
    flushSync();

    expect(globalThis.fetch).toHaveBeenCalledWith('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id: 1 })
    });
  });

  it('hides validation and edit actions when the season is closed', () => {
    const closedSeasons = [
      { id: '25-26', name: 'Saison 2025-2026', active: true, closed: true },
      { id: '24-25', name: 'Saison 2024-2025', active: false, closed: false }
    ];

    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpensesManager, {
      target,
      props: {
        expenses,
        seasonId: '25-26',
        seasons: closedSeasons,
        categories

      }
    });
    flushSync();

    expect(target.innerHTML).toContain('Marie Curie');
    expect(target.innerHTML).not.toContain('Modifier');
    expect(target.innerHTML).not.toContain('Rembourser');
    expect(target.innerHTML).not.toContain('Rejeter');
  });
});
