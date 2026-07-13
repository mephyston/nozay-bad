import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ExpensesManager from './ExpensesManager.svelte';

describe('ExpensesManager Component', () => {
  const seasons = [
    { id: '25-26', name: 'Saison 2025-2026', active: true },
    { id: '24-25', name: 'Saison 2024-2025', active: false }
  ];

  const expenses = [
    {
      id: 1,
      seasonId: '25-26',
      description: 'Achat de volants RSL',
      category: 'materiel' as const,
      amount: 12000, // 120.00 €
      photoUrl: 'http://example.com/receipt.jpg',
      status: 'pending' as const,
      emitterName: 'Marie Curie',
      memberId: null,
      transactionId: null,
      createdAt: '2026-07-13T10:00:00.000Z'
    }
  ];

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as any)
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
        seasons
      }
    });
    flushSync();

    expect(target.innerHTML).toContain('Marie Curie');
    expect(target.innerHTML).toContain('120.00 €');
    expect(target.innerHTML).toContain('Achat de volants RSL');
    expect(target.innerHTML).toContain('Matériel &amp; Fournitures');
    expect(target.innerHTML).toContain('Visualiser');
  });

  it('calls fetch on action click', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpensesManager, {
      target,
      props: {
        expenses,
        seasonId: '25-26',
        seasons
      }
    });
    flushSync();

    const approveButton = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'Rembourser'
    );
    expect(approveButton).toBeDefined();

    approveButton?.click();
    flushSync();

    expect(global.fetch).toHaveBeenCalledWith('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id: 1 })
    });
  });
});
