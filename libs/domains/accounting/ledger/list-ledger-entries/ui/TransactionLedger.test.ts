import { describe, it, expect } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import TransactionLedger from './TransactionLedger.svelte';

describe('TransactionLedger Component', () => {
  it('renders balances, transaction list, and pagination correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [
          {
            id: 1,
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            destinationAccountId: null,
            category: 'adhesions',
            amount: 4500, // 45.00 €
            date: '2026-07-13',
            paymentMethod: 'virement',
            description: 'Cotisation Martin',
            reference: 'VIR-9988'
          }
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        },
        seasonId: '25-26',
        balances: [
          { id: 1, accountId: 'current', label: 'Compte Courant', initialBalance: 100000, finalBalance: 104500 },
          { id: 2, accountId: 'savings', label: 'Livret A / Épargne', initialBalance: 200000, finalBalance: 200000 },
          { id: 3, accountId: 'cash', label: 'Caisse Buvette', initialBalance: 5000, finalBalance: 5000 }
        ],
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ]
      }
    });

    expect(target.innerHTML).toContain('Journal des écritures');
    expect(target.innerHTML.replace(/&nbsp;|[\u00a0\u202f]/g, ' ')).toContain('1 045,00'); // Compte Courant final balance
    expect(target.innerHTML).toContain('Cotisation Martin');
    expect(target.innerHTML).toContain('+45,00');
    expect(target.innerHTML).toContain('VIR-9988');

    unmount(component);
    document.body.removeChild(target);
  });

  it('renders outstanding checks toggle and intermediate pages in pagination', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [],
        pagination: {
          total: 100,
          page: 5,
          limit: 20,
          totalPages: 10
        },
        seasonId: '25-26',
        balances: [],
        seasons: [],
        categories: [],
        accountClasses: [],
        unreconciledChequesOnly: true
      }
    });

    // Pagination compacte : page courante active + bornes ; les pages
    // intermédiaires (2,3,7) sont remplacées par des ellipses.
    expect(target.innerHTML).toContain('Page 5 sur 10');
    const activeBtn = target.querySelector('[aria-current="page"]');
    expect(activeBtn).not.toBeNull();
    expect(activeBtn?.textContent?.trim()).toBe('5');
    const pageLabels = Array.from(target.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(pageLabels).toContain('1');
    expect(pageLabels).toContain('10');

    // Le filtre "Chèques en circulation" est dans le menu "Filtres" ; comme
    // unreconciledChequesOnly=true, le bouton Filtres affiche son indicateur
    // de filtre actif (pastille).
    const filtresBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Filtres')) as HTMLButtonElement;
    expect(filtresBtn).toBeDefined();
    expect(filtresBtn.querySelector('span.rounded-full')).not.toBeNull();

    unmount(component);
    document.body.removeChild(target);
  });

  it('should render actions trigger and open edit/delete buttons inside Popover', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [
          {
            id: 1,
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            destinationAccountId: null,
            category: '1',
            amount: 1500,
            date: '2026-07-16',
            paymentMethod: 'virement',
            description: 'Cotisation Test',
            reference: null
          }
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        seasonId: '25-26',
        balances: [],
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ]
      }
    });
    flushSync();

    // Le menu d'actions de ligne (DataTableRowActions) : bouton icône avec
    // libellé accessible "Ouvrir le menu".
    const triggerBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Ouvrir le menu')
    ) as HTMLButtonElement;
    expect(triggerBtn).toBeDefined();

    // Cliquer sur le déclencheur pour ouvrir le Popover
    triggerBtn.click();
    flushSync();

    // Laisser le temps à Melt UI d'hydrater et positionner le popover
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    // Vérifier la présence des options
    expect(document.body.innerHTML).toContain('Éditer');
    expect(document.body.innerHTML).toContain('Supprimer');

    unmount(component);
    document.body.removeChild(target);
  });

  it('renders the account balance overview cards', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
        seasonId: '25-26',
        balances: [
          { id: 1, accountId: 'current', label: 'Compte Courant', initialBalance: 0, finalBalance: 0 },
          { id: 2, accountId: 'savings', label: 'Livret A / Épargne', initialBalance: 0, finalBalance: 0 },
          { id: 3, accountId: 'cash', label: 'Caisse Buvette', initialBalance: 0, finalBalance: 0 },
          { id: 4, accountId: 'badnet', label: 'Porte-monnaie Badnet', initialBalance: 100000, finalBalance: 100000 },
          { id: 5, accountId: 'member_advances', label: 'Fonds reçus pour le compte des adhérents', thirdParty: true, initialBalance: 0, finalBalance: -12000 }
        ],
        accountId: 'current'
      }
    });

    // Le filtrage par compte est désormais dans le menu "Filtres" ; les comptes restent
    // affichés en permanence via les cartes de solde en tête — une par ligne du bilan, avec
    // le libellé lu de la base, le porte-monnaie Badnet compris.
    expect(target.innerHTML).toContain('Compte Courant');
    expect(target.innerHTML).toContain('Livret A / Épargne');
    expect(target.innerHTML).toContain('Caisse Buvette');
    expect(target.innerHTML).toContain('Porte-monnaie Badnet');
    // Le compte d'attente des adhérents se lit en dette positive, hors trésorerie.
    expect(target.innerHTML).toContain('Dû aux adhérents');
    expect(target.innerHTML.replace(/&nbsp;|[\u00a0\u202f]/g, ' ')).toContain('120,00');
    expect(target.innerHTML.replace(/&nbsp;|[\u00a0\u202f]/g, ' ')).not.toContain('-120,00');
    expect(target.querySelectorAll('[data-slot="card"], .grid > div').length).toBeGreaterThanOrEqual(4);

    unmount(component);
    document.body.removeChild(target);
  });

  it("affiche le rattachement d'exercice d'une écriture, et pas seulement dans son formulaire", () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [
          {
            id: 2,
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            destinationAccountId: null,
            category: 'adhesions',
            amount: 25000,
            date: '2026-08-21',
            paymentMethod: 'virement',
            description: 'VIR INST RE 673390599511',
            reference: null,
            accrualType: 'produit_constate_avance',
            accrualNote: 'Saison 26-27'
          }
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        seasonId: '25-26',
        balances: [{ accountId: 'current', initialBalance: 0, finalBalance: 25000 }],
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }]
      }
    });

    flushSync();
    expect(target.innerHTML).toContain("Produit constaté d'avance");
    expect(target.innerHTML).toContain('Saison 26-27');

    unmount(component);
    document.body.removeChild(target);
  });

  /*
   * Le solde progressif et les soldes de fin de mois ne valent que sur une liste
   * continue : une recherche ou un filtre en retire une partie, et un « solde fin
   * septembre » posé sur la dernière écriture trouvée mentirait.
   */
  const deuxMois = [
    { id: 1, seasonId: '25-26', type: 'recette', accountId: 'current', category: 'adhesions', amount: 4500, date: '2026-10-02', paymentMethod: 'virement', description: 'Cotisation Martin', reference: null, runningBalanceCents: 104500 },
    { id: 2, seasonId: '25-26', type: 'recette', accountId: 'current', category: 'adhesions', amount: 1000, date: '2026-09-20', paymentMethod: 'virement', description: 'Cotisation Durand', reference: null, runningBalanceCents: 100000 }
  ];
  const monter = (props: Record<string, unknown>) => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(TransactionLedger, {
      target,
      props: { transactions: deuxMois, pagination: { total: 2, page: 1, limit: 20, totalPages: 1 }, seasonId: '25-26', balances: [], seasons: [], ...props }
    });
    flushSync();
    return { target, component };
  };

  it('montre le solde et le repère de fin de mois sur la liste complète', () => {
    const { target, component } = monter({});
    expect(target.textContent).toContain('Solde fin septembre 2026');
    expect(target.textContent?.replace(/[\u00a0\u202f]/g, ' ')).toContain('1 045,00');
    unmount(component);
    target.remove();
  });

  it('cache le solde et les repères de fin de mois dès que la liste est filtrée', () => {
    const { target, component } = monter({ searchQuery: 'Martin' });
    expect(target.textContent).not.toContain('Solde fin septembre 2026');
    expect(target.textContent?.replace(/[\u00a0\u202f]/g, ' ')).not.toContain('1 045,00');
    // Les écritures, elles, restent.
    expect(target.textContent).toContain('Cotisation Martin');
    unmount(component);
    target.remove();
  });

  it("garde le solde sur un filtre par mois : la liste reste continue", () => {
    const { target, component } = monter({ month: '2026-09' });
    expect(target.textContent?.replace(/[\u00a0\u202f]/g, ' ')).toContain('1 045,00');
    unmount(component);
    target.remove();
  });
});
