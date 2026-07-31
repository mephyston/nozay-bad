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
          { accountId: 'current', initialBalance: 100000, finalBalance: 104500 },
          { accountId: 'savings', initialBalance: 200000, finalBalance: 200000 },
          { accountId: 'cash', initialBalance: 5000, finalBalance: 5000 }
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
        balances: [],
        accountId: 'current'
      }
    });

    // Le filtrage par compte est désormais dans le menu "Filtres" ; les trois
    // comptes restent affichés en permanence via les cartes de solde en tête.
    expect(target.innerHTML).toContain('Compte Courant');
    expect(target.innerHTML).toContain('Compte Livret');
    expect(target.innerHTML).toContain('Caisse Physique');

    unmount(component);
    document.body.removeChild(target);
  });
});
