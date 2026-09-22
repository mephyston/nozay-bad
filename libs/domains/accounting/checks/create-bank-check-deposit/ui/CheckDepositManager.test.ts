import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import CheckDepositManager from './CheckDepositManager.svelte';

describe('CheckDepositManager Component', () => {
  let component: any = null;

  beforeAll(() => {
    // Mock ResizeObserver which is required by Radix / bits-ui
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // Mock matchMedia which is required by Radix / bits-ui
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (component) {
      unmount(component);
      component = null;
    }
    document.body.innerHTML = '';
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('renders received checks and past check deposits correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(CheckDepositManager, {
      target,
      props: {
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ],
        checks: [
          {
            id: 1,
            checkDepositId: null,
            seasonId: '25-26',
            number: '1234567',
            amount: 15000, // 150.00 €
            emitter: 'Dupont Marc',
            bank: 'Société Générale',
            memberId: 10,
            ledgerEntryId: 100,
            status: 'received',
            photoUrl: null,
            createdAt: '2026-07-13T12:00:00Z',
            memberName: 'Dupont Marc',
            memberLicence: 'LIC-123'
          }
        ],
        checkDeposits: [
          {
            id: 2,
            seasonId: '25-26',
            reference: 'REMISE-OLD-1',
            date: '2026-07-12',
            amount: 30000,
            status: 'deposited',
            bankStatementLineId: null,
            createdAt: '2026-07-12T12:00:00Z'
          }
        ],
        members: [
          { id: 10, licence: 'LIC-123', lastName: 'DUPONT', firstName: 'Marc', parent1Name: null, parent2Name: null }
        ],
        pendingBankTransactions: []
      }
    });

    expect(target.innerHTML).toContain('Chèques reçus');
    expect(target.innerHTML).toContain('1234567');
    expect(target.innerHTML).toContain('Dupont Marc');
    expect(target.innerHTML).toContain('150,00');
  });

  it('uses standard UI Checkbox components, has font-mono usages for amounts, and has no-print class on Tabs.List', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(CheckDepositManager, {
      target,
      props: {
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ],
        checks: [
          {
            id: 1,
            checkDepositId: null,
            seasonId: '25-26',
            number: '1234567',
            amount: 15000, // 150.00 €
            emitter: 'Dupont Marc',
            bank: 'Société Générale',
            memberId: 10,
            ledgerEntryId: 100,
            status: 'received',
            photoUrl: null,
            createdAt: '2026-07-13T12:00:00Z',
            memberName: 'Dupont Marc',
            memberLicence: 'LIC-123'
          }
        ],
        checkDeposits: [
          {
            id: 2,
            seasonId: '25-26',
            reference: 'REMISE-OLD-1',
            date: '2026-07-12',
            amount: 30000,
            status: 'deposited',
            bankStatementLineId: null,
            createdAt: '2026-07-12T12:00:00Z'
          }
        ],
        members: [
          { id: 10, licence: 'LIC-123', lastName: 'DUPONT', firstName: 'Marc', parent1Name: null, parent2Name: null }
        ],
        pendingBankTransactions: []
      }
    });

    // 1. Checkboxes should be the Svelte shared-ui Checkbox components (not raw inputs)
    const inputs = target.querySelectorAll('input[type="checkbox"]');
    expect(inputs.length).toBe(0);

    const customCheckboxes = target.querySelectorAll('[role="checkbox"]');
    expect(customCheckboxes.length).toBeGreaterThan(0);

    // 2. font-outfit should be used on amount elements
    const fontOutfitElements = target.querySelectorAll('.font-outfit');
    expect(fontOutfitElements.length).toBeGreaterThan(0);

    // 3. no-print should be on the Tabs.List element
    const noPrintElements = target.querySelectorAll('.no-print');
    expect(noPrintElements.length).toBeGreaterThan(0);
  });

  it('renders the "Enregistrer un Chèque" trigger button', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(CheckDepositManager, {
      target,
      props: {
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ],
        checks: [],
        checkDeposits: [],
        members: [
          { id: 10, licence: 'LIC-123', lastName: 'DUPONT', firstName: 'Marc', parent1Name: null, parent2Name: null }
        ],
        pendingBankTransactions: []
      }
    });

    const buttons = target.querySelectorAll('button');
    const openButton = Array.from(buttons).find(btn => btn.textContent?.includes('Enregistrer un chèque'));
    expect(openButton).toBeDefined();
  });
  /*
    La vue au doigt. Les deux tableaux rendaient des cartes écrites à la main, dont le
    menu d'actions était un bouton d'icône de 32 px posé dans un coin. La rangée de
    liste dit la même chose, et son geste central — retenir un chèque pour une remise —
    prend toute la ligne au lieu d'une case de 20 px.
  */
  const jeuComplet = {
    seasonId: '25-26',
    seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
    checks: [
      {
        id: 1,
        checkDepositId: null,
        seasonId: '25-26',
        number: '1234567',
        amount: 15000,
        emitter: 'Dupont Marc',
        bank: 'Société Générale',
        memberId: 10,
        ledgerEntryId: null,
        status: 'received',
        photoUrl: null,
        createdAt: '2026-07-13T12:00:00Z',
        memberName: 'Dupont Marc',
        memberLicence: 'LIC-123'
      }
    ],
    checkDeposits: [
      {
        id: 2,
        seasonId: '25-26',
        reference: 'REMISE-OLD-1',
        date: '2026-07-12',
        amount: 30000,
        status: 'deposited' as const,
        bankStatementLineId: null,
        createdAt: '2026-07-12T12:00:00Z'
      }
    ],
    members: [
      { id: 10, licence: 'LIC-123', lastName: 'DUPONT', firstName: 'Marc', parent1Name: null, parent2Name: null }
    ],
    pendingBankTransactions: []
  };

  function monter(props: Record<string, unknown> = {}) {
    const target = document.createElement('div');
    document.body.appendChild(target);
    component = mount(CheckDepositManager, { target, props: { ...jeuComplet, ...props } });
    flushSync();
    return target;
  }

  const rangees = (t: HTMLElement) => Array.from(t.querySelectorAll('[data-list-row]'));
  const libellesDeBalayage = (li: Element) =>
    Array.from(li.querySelectorAll('[data-swipe-track] button')).map((b) => (b.textContent || '').trim());

  it('projette un chèque en rangée : émetteur, numéro, banque, date et montant', () => {
    const target = monter();
    const cheque = rangees(target).find((li) => li.textContent?.includes('Dupont Marc'));
    expect(cheque, 'la vue au doigt doit rendre une rangée par chèque').toBeTruthy();
    const texte = (cheque!.textContent ?? '').replace(/[\u00a0\u202f]/g, ' ');
    expect(texte).toContain('N° 1234567 · Société Générale');
    expect(texte).toContain('150,00');
  });

  it("fait de la rangée l'interrupteur de sélection, et l'annonce", () => {
    const target = monter();
    const cheque = rangees(target).find((li) => li.textContent?.includes('Dupont Marc'))!;
    const bouton = cheque.querySelector('[data-swipe-layer] > button') as HTMLButtonElement;

    // `aria-pressed` : sans lui, un lecteur d'écran ne dit pas ce qui est retenu.
    expect(bouton.getAttribute('aria-pressed')).toBe('false');
    bouton.click();
    flushSync();
    expect(
      (target.querySelector('[data-list-row] [data-swipe-layer] > button') as HTMLButtonElement)
        .getAttribute('aria-pressed')
    ).toBe('true');
  });

  it("retire tout geste à un chèque déjà inscrit sur un bordereau", () => {
    const target = monter({
      checks: [{ ...jeuComplet.checks[0], checkDepositId: 2 }]
    });
    const cheque = rangees(target).find((li) => li.textContent?.includes('Dupont Marc'))!;
    expect(libellesDeBalayage(cheque)).toEqual([]);
    // Et il ne se retient plus : il appartient à cette remise.
    expect(cheque.querySelector('[data-swipe-layer] > button')).toBeNull();
  });

  it('révèle au balayage la modification puis la suppression', () => {
    const target = monter();
    const cheque = rangees(target).find((li) => li.textContent?.includes('Dupont Marc'))!;
    expect(libellesDeBalayage(cheque)).toEqual(['Modifier', 'Supprimer']);
  });

  it("projette un bordereau, et son étape suivante vient en tête", () => {
    const target = monter({ initialTab: 'deposits' });
    const remise = rangees(target).find((li) => li.textContent?.includes('REMISE-OLD-1'));
    expect(remise, 'la vue au doigt doit rendre une rangée par bordereau').toBeTruthy();
    const texte = (remise!.textContent ?? '').replace(/[\u00a0\u202f]/g, ' ');
    expect(texte).toContain('12/07/2026');
    expect(texte).toContain('300,00');
    expect(texte).toContain('Déposée');
    // Déposée : l'étape suivante est l'encaissement.
    expect(libellesDeBalayage(remise!)[0]).toBe('Encaisser (ligne du relevé)');
  });
});
