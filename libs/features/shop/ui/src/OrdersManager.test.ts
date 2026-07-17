import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import OrdersManager from './OrdersManager.svelte';

describe('OrdersManager Component', () => {
  const seasons = [
    { id: '25-26', name: 'Saison 2025-2026', active: true },
    { id: '24-25', name: 'Saison 2024-2025', active: false }
  ];

  const orders = [
    {
      order: {
        id: 1,
        seasonId: '25-26',
        memberId: 10,
        productId: 100,
        quantity: 2,
        totalAmount: 5000, // 50.00 €
        paymentMethod: 'virement' as const,
        status: 'pending' as const,
        transactionId: null,
        createdAt: '2026-07-13T10:00:00.000Z'
      },
      member: {
        id: 10,
        firstName: 'Jean',
        lastName: 'Dupont',
        licence: '123456'
      },
      product: {
        id: 100,
        name: 'Yonex BG65 String',
        price: 2500,
        stock: 5,
        active: true,
        category: 'string'
      }
    },
    {
      order: {
        id: 2,
        seasonId: '25-26',
        memberId: 11,
        productId: 101,
        quantity: 1,
        totalAmount: 1550, // 15.50 €
        paymentMethod: 'cheque' as const,
        status: 'approved' as const,
        transactionId: 55,
        createdAt: '2026-07-12T10:00:00.000Z'
      },
      member: {
        id: 11,
        firstName: 'Alice',
        lastName: 'Martin',
        licence: '654321'
      },
      product: {
        id: 101,
        name: 'Babolat Tour shuttlecock',
        price: 1550,
        stock: 10,
        active: true,
        category: 'shuttlecock'
      }
    },
    {
      order: {
        id: 3,
        seasonId: '24-25',
        memberId: 12,
        productId: 101,
        quantity: 3,
        totalAmount: 4650, // 46.50 €
        paymentMethod: 'especes' as const,
        status: 'rejected' as const,
        transactionId: null,
        createdAt: '2025-07-12T10:00:00.000Z'
      },
      member: {
        id: 12,
        firstName: 'Bob',
        lastName: 'Lefebvre',
        licence: '987654'
      },
      product: {
        id: 101,
        name: 'Babolat Tour shuttlecock',
        price: 1550,
        stock: 0,
        active: true,
        category: 'shuttlecock'
      }
    }
  ];

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(''),
        json: () => Promise.resolve({ success: true, data: { status: 'approved' } })
      } as any)
    );
    // Mock window.location.reload
    vi.stubGlobal('location', {
      reload: vi.fn()
    });
    // Mock confirm
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders pending orders by default', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: {
        seasons,
        orders,
        seasonId: '25-26'
      }
    });

    // Default tab should be pending
    expect(target.innerHTML).toContain('Demandes en attente (1)');

    // Pending Order info
    expect(target.innerHTML).toContain('Dupont');
    expect(target.innerHTML).toContain('Jean');
    expect(target.innerHTML).toContain('Yonex BG65 String');
    expect(target.innerHTML).toContain('50.00 €');
    expect(target.innerHTML).toContain('Virement');

    // Open dropdown to render actions
    const actionBtn = target.querySelector('button[aria-label="Actions"]') as HTMLButtonElement;
    expect(actionBtn).not.toBeNull();
    actionBtn.click();
    flushSync();

    // Actions
    expect(target.innerHTML).toContain('Valider');
    expect(target.innerHTML).toContain('Refuser');

    // History orders should not be in the pending list
    expect(target.innerHTML).not.toContain('Martin Alice');
  });

  it('renders history (approved and rejected) orders when history tab is selected', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: {
        seasons,
        orders,
        seasonId: '25-26'
      }
    });

    // Switch to history tab
    const historyBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Historique')
    ) as HTMLButtonElement;
    expect(historyBtn).not.toBeNull();
    historyBtn.click();
    flushSync();

    // Check history count
    expect(target.innerHTML).toContain('Historique (2)');

    // Approved order
    expect(target.innerHTML).toContain('Martin');
    expect(target.innerHTML).toContain('Alice');
    expect(target.innerHTML).toContain('Validée');
    expect(target.innerHTML).toContain('15.50 €');
    expect(target.innerHTML).toContain('Tx: #55');

    // Rejected order
    expect(target.innerHTML).toContain('Lefebvre');
    expect(target.innerHTML).toContain('Bob');
    expect(target.innerHTML).toContain('Refusée');
    expect(target.innerHTML).toContain('46.50 €');
  });

  it('triggers approve action when Valider is clicked', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: {
        seasons,
        orders,
        seasonId: '25-26'
      }
    });

    // Open dropdown to render actions
    const actionBtn = target.querySelector('button[aria-label="Actions"]') as HTMLButtonElement;
    expect(actionBtn).not.toBeNull();
    actionBtn.click();
    flushSync();

    const approveBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Valider')
    ) as HTMLButtonElement;
    expect(approveBtn).not.toBeNull();

    approveBtn.click();
    flushSync();

    expect(global.fetch).toHaveBeenCalledWith('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id: 1 })
    });
  });

  it('triggers reject action when Refuser is clicked', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: {
        seasons,
        orders,
        seasonId: '25-26'
      }
    });

    // Open dropdown to render actions
    const actionBtn = target.querySelector('button[aria-label="Actions"]') as HTMLButtonElement;
    expect(actionBtn).not.toBeNull();
    actionBtn.click();
    flushSync();

    const rejectBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Refuser')
    ) as HTMLButtonElement;
    expect(rejectBtn).not.toBeNull();

    rejectBtn.click();
    flushSync();

    expect(window.confirm).toHaveBeenCalledWith('Êtes-vous sûr de vouloir refuser cette commande ?');
    expect(global.fetch).toHaveBeenCalledWith('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id: 1 })
    });
  });

  it('disables validation actions when the season is closed', async () => {
    const seasonsClosed = [
      { id: '25-26', name: 'Saison 2025-2026', active: true, closed: true }
    ];
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: {
        seasons: seasonsClosed,
        orders,
        seasonId: '25-26'
      }
    });

    // Open dropdown to render actions
    const actionBtn = target.querySelector('button[aria-label="Actions"]') as HTMLButtonElement;
    expect(actionBtn).not.toBeNull();
    actionBtn.click();
    flushSync();

    const approveBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Valider')
    ) as HTMLButtonElement;
    const rejectBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Refuser')
    ) as HTMLButtonElement;

    expect(approveBtn).not.toBeNull();
    expect(approveBtn.disabled).toBe(true);

    expect(rejectBtn).not.toBeNull();
    expect(rejectBtn.disabled).toBe(true);
  });
});
