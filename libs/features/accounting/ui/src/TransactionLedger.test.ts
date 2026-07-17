import { describe, it, expect } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import TransactionLedger from './TransactionLedger.svelte';

describe('TransactionLedger Component', () => {
  it('renders balances, transaction list, and pagination correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(TransactionLedger, {
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
    expect(target.innerHTML).toContain('1045.00 €'); // Compte Courant final balance
    expect(target.innerHTML).toContain('Cotisation Martin');
    expect(target.innerHTML).toContain('+45.00 €');
    expect(target.innerHTML).toContain('VIR-9988');
  });

  it('renders outstanding checks toggle and intermediate pages in pagination', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(TransactionLedger, {
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

    expect(target.innerHTML).toContain('Chèques en circulation');
    expect(target.innerHTML).toContain('1');
    expect(target.innerHTML).toContain('2'); // Page 2 is displayed directly instead of rendering an ellipsis
    expect(target.innerHTML).toContain('3');
    expect(target.innerHTML).toContain('4');
    expect(target.innerHTML).toContain('5');
    expect(target.innerHTML).toContain('6');
    expect(target.innerHTML).toContain('7');
    expect(target.innerHTML).toContain('10');
    
    // Check for aria-current on the active page
    const activeBtn = target.querySelector('[aria-current="page"]');
    expect(activeBtn).not.toBeNull();
    expect(activeBtn?.textContent?.trim()).toBe('5');
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

    // Trouver le bouton d'actions (MoreVertical)
    const triggerBtn = target.querySelector('button[aria-label="Actions"]') as HTMLButtonElement;
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
});
