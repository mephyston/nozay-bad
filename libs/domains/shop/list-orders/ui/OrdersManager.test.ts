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
 * Les deux voies d'accès aux actions d'une commande, désignées chacune sans ambiguïté.
 *
 * Elles partent de la même déclaration (`actionsDeCommande`) mais se rendent
 * différemment : le tableau de bureau en fait un menu, la liste au doigt les révèle
 * sous la ligne. Les sonder séparément est ce qui garantit qu'aucune des deux ne
 * perde une action en route — c'est exactement ce qui était arrivé aux cartes
 * mobiles, qui ignoraient l'annulation d'encaissement que le menu offrait.
 */

/**
 * Ouvre le menu d'actions de la première ligne du tableau. À n'appeler qu'une fois par
 * montage : le déclencheur est une bascule, un second clic refermerait le menu.
 *
 * Le `aria-haspopup` vaut « menu » et non « true » : il vient de bits-ui depuis que le
 * déclencheur est celui du design system, et non plus un bouton écrit à la main.
 */
function openActions(target: HTMLElement): void {
  const trigger = target.querySelector('tbody button[aria-haspopup="menu"]') as HTMLButtonElement;
  expect(trigger, 'aucun menu de ligne dans le tableau').not.toBeNull();
  trigger.click();
  flushSync();
}

/** Un item du menu de ligne ouvert, ou tout autre bouton nommé du rendu. */
function actionButton(target: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(target.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(label)
  ) as HTMLButtonElement;
  expect(button, `bouton « ${label} » absent`).not.toBeUndefined();
  return button;
}

/** L'action révélée par un balayage, sur la ligne de rang `rang` de la liste au doigt. */
function actionDeBalayage(target: HTMLElement, label: string, rang = 0): HTMLButtonElement {
  const pistes = Array.from(target.querySelectorAll('[data-swipe-track]'));
  expect(pistes.length, 'aucune piste de balayage dans la liste').toBeGreaterThan(rang);
  const button = Array.from(pistes[rang].querySelectorAll('button')).find(
    (b) => b.textContent?.includes(label)
  ) as HTMLButtonElement;
  expect(button, `action de balayage « ${label} » absente`).not.toBeUndefined();
  return button;
}

/** Les libellés révélés par un balayage, dans l'ordre du DOM — donc de la déclaration. */
function libellesDeBalayage(target: HTMLElement, rang = 0): string[] {
  const pistes = Array.from(target.querySelectorAll('[data-swipe-track]'));
  if (pistes.length <= rang) return [];
  return Array.from(pistes[rang].querySelectorAll('button')).map((b) => (b.textContent || '').trim());
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
        paymentMethod: 'virement',
        paymentMethodLabel: 'Virement',
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
        paymentMethod: 'cheque',
        paymentMethodLabel: 'Chèque',
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
        paymentMethod: 'especes',
        paymentMethodLabel: 'Espèces',
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
        paymentMethod: 'especes',
        paymentMethodLabel: 'Espèces',
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
        paymentMethod: 'cheque',
        paymentMethodLabel: 'Chèque',
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

  it('renders every open order by default: awaiting validation and awaiting payment alike', () => {
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

    // La vue « en cours » est celle qu'on ouvre : la demande à valider et la commande
    // à encaisser y figurent ensemble, chacune avec son étape.
    expect(target.innerHTML).toContain('Dupont');
    expect(target.innerHTML).toContain('Jean');
    expect(target.innerHTML).toContain('Yonex BG65 String');
    expect(target.innerHTML).toContain('50,00');
    expect(target.innerHTML).toContain('Virement');
    expect(target.innerHTML).toContain('À valider');
    expect(target.innerHTML).toContain('Renard');
    expect(target.innerHTML).toContain('En attente de paiement');
    expect(target.innerHTML).toContain('01/07/2026');

    // La première ligne est la demande à valider : ses actions sont celles de son étape.
    openActions(target);
    expect(actionButton(target, 'Valider')).not.toBeUndefined();
    expect(actionButton(target, 'Refuser')).not.toBeUndefined();

    // L'historique ne déborde pas sur cette vue.
    expect(target.innerHTML).not.toContain('Martin');
    expect(target.innerHTML).not.toContain('Noel');
  });

  it('renders only orders awaiting validation on that view', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders, seasonId: '25-26', activeTab: 'created' }
    });
    flushSync();

    expect(target.innerHTML).toContain('Dupont');
    expect(target.innerHTML).not.toContain('Martin');
    expect(target.innerHTML).not.toContain('Renard');
  });

  it('encaisse une commande en attente de paiement depuis la vue réunie', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders: orders.filter((o) => o.order.status === 'awaiting_payment'), seasonId: '25-26' }
    });
    flushSync();

    openActions(target);
    actionButton(target, 'Encaisser').click();
    flushSync();

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/api/shop/orders', expect.objectContaining({
      body: JSON.stringify({ action: 'pay', id: 4 })
    }));
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

  it("annule l'encaissement d'une commande payée depuis l'historique, après confirmation", async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders, seasonId: '25-26', activeTab: 'history' }
    });
    flushSync();

    // Seule la commande payée porte un menu : refusée et annulée sont des issues fermées.
    expect(target.querySelectorAll('tbody button[aria-haspopup="menu"]').length).toBe(1);

    openActions(target);
    actionButton(target, "Annuler l'encaissement").click();
    flushSync();

    const { uiConfirm } = await import('@nba/ui');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(uiConfirm).toHaveBeenCalledWith(expect.stringContaining("retirée du grand livre"));
    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/api/shop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unpay', id: 2 })
    });
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

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/api/shop/orders', {
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

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/api/shop/orders', {
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
    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/api/shop/orders', {
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
    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/api/shop/orders', {
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

    // Une saison clôturée ne propose plus rien : ni menu dans le tableau, ni action
    // révélable au balayage. Un item grisé n'aurait dit ni ce qu'il fait, ni pourquoi
    // il ne le fait pas — le bandeau « Lecture seule » de l'en-tête s'en charge.
    expect(target.querySelector('tbody button[aria-haspopup="menu"]')).toBeNull();
    expect(libellesDeBalayage(target)).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('révèle au balayage les mêmes actions que le menu, la réversible en tête', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders, seasonId: '25-26', activeTab: 'created' }
    });
    flushSync();

    // L'ordre du DOM est celui de la déclaration : la première action est celle qu'un
    // balayage long exécute, et ce doit être la réversible.
    expect(libellesDeBalayage(target)).toEqual(['Valider', 'Refuser']);
  });

  it('exécute la transition depuis le balayage comme depuis le menu', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: {
        seasons,
        orders: orders.filter((o) => o.order.status === 'awaiting_payment'),
        seasonId: '25-26'
      }
    });
    flushSync();

    actionDeBalayage(target, 'Encaisser').click();
    flushSync();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/admin/api/shop/orders',
      expect.objectContaining({ body: JSON.stringify({ action: 'pay', id: 4 }) })
    );
  });

  it("n'offre à l'historique que le retour en arrière, et sur la seule commande payée", () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders, seasonId: '25-26', activeTab: 'history' }
    });
    flushSync();

    // Trois lignes d'historique, une seule piste de balayage garnie : refusée et
    // annulée sont des issues closes, et ne se rouvrent pas.
    const garnies = Array.from(target.querySelectorAll('[data-swipe-track]')).filter(
      (piste) => piste.querySelectorAll('button').length > 0
    );
    expect(garnies.length).toBe(1);
    expect(garnies[0].textContent).toContain("Annuler l'encaissement");
  });
  it("ouvre la fiche d'une commande au doigt, avec ce que la ligne ne porte plus", async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons, orders, seasonId: '25-26', activeTab: 'awaiting_payment' }
    });
    flushSync();

    // La zone cliquable de la ligne, et non les boutons de la piste de balayage qui
    // la précèdent dans le DOM.
    const ligne = target.querySelector('[data-list-row] [data-swipe-layer] > button') as HTMLButtonElement;
    expect(ligne, 'la ligne de liste doit être actionnable').not.toBeNull();
    ligne.click();
    flushSync();
    await new Promise((resolve) => setTimeout(resolve, 0));

    /*
      La feuille est portée hors du conteneur de montage : on la cherche dans le
      document. Elle porte ce que la ligne a laissé tomber — moyen de paiement,
      ancienneté, numéro — et nomme les deux décisions.
    */
    const dialogue = document.querySelector('[role="dialog"]');
    expect(dialogue, 'la fiche doit être ouverte').not.toBeNull();
    const feuille = dialogue!.textContent ?? '';
    expect(feuille).toContain('Renard Chloé');
    expect(feuille).toContain('Règlement');
    expect(feuille).toContain('En attente depuis');
    expect(feuille).toContain('Encaisser');
    expect(feuille).toContain('Annuler');
  });
  it('reconnaît une saison clôturée à son code, et non à sa clé primaire', () => {
    /*
      La forme réelle du relais : `id` est la clé primaire, `code` est ce qui circule
      dans `?season=` et dans `seasonId`. Les comparer sur `id` ne réussissait jamais,
      et une saison close continuait d'offrir de valider et d'encaisser.
    */
    const saisonsRelais = [
      { id: 2, code: '25-26', name: 'Saison 2025-2026', active: true, closed: true }
    ];
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(OrdersManager, {
      target,
      props: { seasons: saisonsRelais, orders, seasonId: '25-26' }
    });
    flushSync();

    expect(target.querySelector('tbody button[aria-haspopup="menu"]')).toBeNull();
    expect(libellesDeBalayage(target)).toEqual([]);
  });
});
