import { describe, it, expect } from 'vitest';
import { mount } from 'svelte';
import CashBoxManager from './CashBoxManager.svelte';

describe('CashBoxManager Component', () => {
  it('renders initial balance, transactions, and calculates totals correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(CashBoxManager, {
      target,
      props: {
        initialBalance: 10000, // 100.00 €
        transactions: [
          {
            id: 1,
            type: 'recette',
            accountId: 'cash',
            destinationAccountId: null,
            category: 'evenements_buvettes',
            amount: 5000, // 50.00 €
            date: '2026-07-13',
            paymentMethod: 'especes',
            description: 'Vente boissons buvette',
            reference: null
          },
          {
            id: 2,
            type: 'depense',
            accountId: 'cash',
            destinationAccountId: null,
            category: 'divers_depense',
            amount: 2000, // 20.00 €
            date: '2026-07-13',
            paymentMethod: 'especes',
            description: 'Achat gobelets',
            reference: null
          }
        ],
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ]
      }
    });

    expect(target.innerHTML).toContain('Solde de la Caisse');
    
    // Check calculations:
    // Solde caisse = 100.00 € (initial) + 50.00 € (totalIn) - 20.00 € (totalOut) = 130.00 €
    expect(target.innerHTML).toContain('130.00 €');
    expect(target.innerHTML).toContain('+50.00 €');
    expect(target.innerHTML).toContain('-20.00 €');

    // Check list entries
    expect(target.innerHTML).toContain('Vente boissons buvette');
    expect(target.innerHTML).toContain('Achat gobelets');
  });

  it('disables the add form and actions when the season is closed', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(CashBoxManager, {
      target,
      props: {
        initialBalance: 10000,
        transactions: [
          {
            id: 1,
            type: 'recette',
            accountId: 'cash',
            destinationAccountId: null,
            category: 'evenements_buvettes',
            amount: 5000,
            date: '2026-07-13',
            paymentMethod: 'especes',
            description: 'Vente boissons buvette',
            reference: null
          }
        ],
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: false, closed: true }
        ]
      }
    });

    const submitBtn = target.querySelector('button[type="submit"]');
    expect(submitBtn).toBeDefined();
    expect(submitBtn?.hasAttribute('disabled')).toBe(true);

    const typeSelect = target.querySelector('select[id="type"]');
    expect(typeSelect).toBeDefined();
    expect(typeSelect?.hasAttribute('disabled')).toBe(true);

    const amountInput = target.querySelector('input[id="amount"]');
    expect(amountInput).toBeDefined();
    expect(amountInput?.hasAttribute('disabled')).toBe(true);

    const dateInput = target.querySelector('input[id="date"]');
    expect(dateInput).toBeDefined();
    expect(dateInput?.hasAttribute('disabled')).toBe(true);

    const categorySelect = target.querySelector('select[id="category"]');
    expect(categorySelect).toBeDefined();
    expect(categorySelect?.hasAttribute('disabled')).toBe(true);

    const descInput = target.querySelector('input[id="description"]');
    expect(descInput).toBeDefined();
    expect(descInput?.hasAttribute('disabled')).toBe(true);

    const deleteBtn = target.querySelector('button[aria-label="Supprimer"]');
    expect(deleteBtn).toBeDefined();
    expect(deleteBtn?.hasAttribute('disabled')).toBe(true);
  });
});
