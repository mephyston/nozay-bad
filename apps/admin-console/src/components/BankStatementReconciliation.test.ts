import { describe, it, expect } from 'vitest';
import { mount, flushSync } from 'svelte';
import BankStatementReconciliation from './BankStatementReconciliation.svelte';

describe('BankStatementReconciliation Component', () => {
  it('renders initial upload zone when no bank transactions are pending', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(BankStatementReconciliation, {
      target,
      props: {
        bankTransactions: [],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: []
      }
    });

    expect(target.innerHTML).toContain('Importer un relevé Société Générale');
    expect(target.innerHTML).toContain("Lancer l'importation");
  });

  it('renders split-screen list and workspace when bank transactions exist', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(BankStatementReconciliation, {
      target,
      props: {
        bankTransactions: [
          {
            id: 1,
            fitid: 'TEST-FITID',
            accountId: 'current',
            amount: -1560,
            date: '2026-02-16',
            name: 'IONOS',
            memo: 'Facture web',
            status: 'pending',
            aiSuggestions: null
          }
        ],
        glTransactions: [
          {
            id: 10,
            type: 'depense',
            accountId: 'current',
            amount: -1560,
            date: '2026-02-16',
            description: 'Facture Ionos',
            category: null,
            bankTransactionId: null
          }
        ],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: [
          {
            id: 42,
            licence: '0102030',
            lastName: 'Dupont',
            firstName: 'Jean',
            amountRemaining: 15000
          }
        ]
      }
    });

    expect(target.innerHTML).toContain('Opérations bancaires en attente (1)');
    expect(target.innerHTML).toContain('IONOS');
    expect(target.innerHTML).toContain('-15.60 €');

    // Cliquer sur le bouton de la transaction pour l'activer dans le panneau droit
    const btn = target.querySelector('button[type="button"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    flushSync();

    // Focus sur l'input de recherche adhérent pour ouvrir le dropdown
    const input = target.querySelector('input[placeholder="Tapez pour rechercher un adhérent..."]') as HTMLInputElement;
    expect(input).not.toBeNull();
    input.focus();
    flushSync();

    // Maintenant, "Dupont Jean" doit être visible dans le select d'association
    expect(target.innerHTML).toContain('Dupont Jean');
  });
});
