import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import OrdersManager from './OrdersManager.svelte';

vi.mock('@nba/ui', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    uiConfirm: vi.fn().mockResolvedValue(true)
  };
});

/**
 * Ouvre le menu d'actions de la première ligne. À n'appeler qu'une fois par montage :
 * le déclencheur est une bascule, un second clic refermerait le menu.
 */
function openActions(target: HTMLElement): void {
  const trigger = target.querySelector('button[aria-haspopup="true"]') as HTMLButtonElement;
  expect(trigger).not.toBeNull();
  trigger.click();
  flushSync();
}

function actionButton(target: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(target.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(label)
  ) as HTMLButtonElement;
  expect(button, `bouton « ${label} » absent`).not.toBeUndefined();
  return button;
}

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
        status: 'created' as const,
        awaitingPaymentSince: null,
        ledgerEntryId: null,
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
        status: 'paid' as const,
        awaitingPaymentSince: null,
        ledgerEntryId: 55,
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
        seasonId: '25-26',
        memberId: 12,
        productId: 101,
        quantity: 3,
        totalAmount: 4650, // 46.50 €
        paymentMethod: 'especes' as const,
        status: 'rejected' as const,
        awaitingPaymentSince: null,
        ledgerEntryId: null,
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
    },
    {
      order: {
        id: 4,
        seasonId: '25-26',
        memberId: 13,
        productId: 100,
        quantity: 1,
        totalAmount: 2500, // 25.00 €
        paymentMethod: 'especes' as const,
        status: 'awaiting_payment' as const,
        awaitingPaymentSince: '2026-07-01',
        ledgerEntryId: null,
        createdAt: '2026-07-01T10:00:00.000Z'
      },
      member: {
        id: 13,
        firstName: 'Chloé',
        lastName: 'Renard',
        licence: '246810'
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
        id: 5,
        seasonId: '25-26',
        memberId: 14,
        productId: 101,
        quantity: 2,
        totalAmount: 3100, // 31.00 €
        paymentMethod: 'cheque' as const,
        status: 'cancelled' as const,
        awaitingPaymentSince: null,
        ledgerEntryId: null,
        createdAt: '2026-06-02T10:00:00.000Z'
      },
      member: {
        id: 14,
        firstName: 'Hugo',
        lastName: 'Noel',
        licence: '135790'
      },
      product: {
        id: 101,
        name: 'Babolat Tour shuttlecock',
        price: 1550,
        stock: 10,
        active: true,
        category: 'shuttlecock'
      }
    }
  ];

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(''),
        json: () => Promise.resolve({ success: true, data: { status: 'awaiting_payment' } })
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
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders orders awaiting validation by default', () => {
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

    // L'onglet « à valider » est actif par défaut : seule la commande créée est rendue.
    expect(target.innerHTML).toContain('Dupont');
    expect(target.innerHTML).toContain('Jean');
    expect(target.innerHTML).toContain('Yonex BG65 String');
    expect(target.innerHTML).toContain('50,00');
    expect(target.innerHTML).toContain('Virement');

    openActions(target);
    expect(actionButton(target, 'Valider')).not.toBeUndefined();
    expect(actionButton(target, 'Refuser')).not.toBeUndefined();

    // Les autres étapes ne débordent pas sur cet onglet.
    expect(target.innerHTML).not.toContain('Martin');
    expect(target.innerHTML).not.toContain('Renard');
  });

  it('renders orders awaiting payment with how long they have been waiting', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: {
        seasons,
        orders,
        seasonId: '25-26',
        activeTab: 'awaiting_payment'
      }
    });
    flushSync();

    expect(target.innerHTML).toContain('Renard');
    expect(target.innerHTML).toContain('25,00');
    // Date de mise en attente, affichée pour repérer les commandes qui traînent.
    expect(target.innerHTML).toContain('01/07/2026');

    openActions(target);
    expect(actionButton(target, 'Encaisser')).not.toBeUndefined();
    expect(actionButton(target, 'Annuler')).not.toBeUndefined();

    expect(target.innerHTML).not.toContain('Dupont');
  });

  it('renders history (paid, rejected and cancelled) orders when history tab is selected', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    // La bascule d'onglet se fait via un SearchableCombobox (dans le popover « Filtres »),
    // impraticable à piloter en jsdom : on monte directement sur la vue historique.
    mount(OrdersManager, {
      target,
      props: {
        seasons,
        orders,
        seasonId: '25-26',
        activeTab: 'history'
      }
    });
    flushSync();

    // Paid order
    expect(target.innerHTML).toContain('Martin');
    expect(target.innerHTML).toContain('Alice');
    expect(target.innerHTML).toContain('Payée');
    expect(target.innerHTML).toContain('15,50');
    expect(target.innerHTML).toContain('Tx: #55');

    // Rejected order
    expect(target.innerHTML).toContain('Lefebvre');
    expect(target.innerHTML).toContain('Refusée');
    expect(target.innerHTML).toContain('46,50');

    // Cancelled order
    expect(target.innerHTML).toContain('Noel');
    expect(target.innerHTML).toContain('Annulée');
    expect(target.innerHTML).toContain('31,00');

    // Une commande encore ouverte n'est pas de l'historique.
    expect(target.innerHTML).not.toContain('Renard');
  });

  it('triggers the validate transition when Valider is clicked', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders, seasonId: '25-26' }
    });

    openActions(target);
    actionButton(target, 'Valider').click();
    flushSync();

    expect(globalThis.fetch).toHaveBeenCalledWith('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate', id: 1 })
    });
  });

  it('triggers the pay transition when Encaisser is clicked', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders, seasonId: '25-26', activeTab: 'awaiting_payment' }
    });
    flushSync();

    openActions(target);
    actionButton(target, 'Encaisser').click();
    flushSync();

    expect(globalThis.fetch).toHaveBeenCalledWith('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pay', id: 4 })
    });
  });

  it('confirms before cancelling an order awaiting payment', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders, seasonId: '25-26', activeTab: 'awaiting_payment' }
    });
    flushSync();

    openActions(target);
    actionButton(target, 'Annuler').click();
    flushSync();

    const { uiConfirm } = await import('@nba/ui');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(uiConfirm).toHaveBeenCalledWith(
      "Annuler cette commande faute de règlement ? Le stock réservé sera rendu."
    );
    expect(globalThis.fetch).toHaveBeenCalledWith('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', id: 4 })
    });
  });

  it('triggers reject action when Refuser is clicked', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders, seasonId: '25-26' }
    });

    openActions(target);
    actionButton(target, 'Refuser').click();
    flushSync();

    const { uiConfirm } = await import('@nba/ui');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(uiConfirm).toHaveBeenCalledWith('Êtes-vous sûr de vouloir refuser cette commande ?');
    expect(globalThis.fetch).toHaveBeenCalledWith('', {
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

    openActions(target);
    const approveBtn = actionButton(target, 'Valider');
    const rejectBtn = actionButton(target, 'Refuser');

    expect(approveBtn).not.toBeNull();
    expect(approveBtn.disabled).toBe(true);

    expect(rejectBtn).not.toBeNull();
    expect(rejectBtn.disabled).toBe(true);
  });
});
