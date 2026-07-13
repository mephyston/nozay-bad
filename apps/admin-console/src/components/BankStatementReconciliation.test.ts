import { describe, it, expect } from 'vitest';
import { mount } from 'svelte';
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
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }]
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
            status: 'pending'
          }
        ],
        glTransactions: [
          {
            id: 10,
            type: 'depense',
            accountId: 'current',
            amount: -1560,
            date: '2026-02-16',
            description: 'Facture Ionos'
          }
        ],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }]
      }
    });

    expect(target.innerHTML).toContain('Opérations bancaires en attente (1)');
    expect(target.innerHTML).toContain('IONOS');
    expect(target.innerHTML).toContain('-15.60 €');
  });
});
