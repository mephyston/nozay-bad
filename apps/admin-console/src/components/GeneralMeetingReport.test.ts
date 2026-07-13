import { describe, it, expect } from 'vitest';
import { mount } from 'svelte';
import GeneralMeetingReport from './GeneralMeetingReport.svelte';

describe('GeneralMeetingReport Component', () => {
  it('renders report details and balances correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(GeneralMeetingReport, {
      target,
      props: {
        report: {
          compteResultat: {
            totalRecettes: 50000,
            totalDepenses: 30000,
            netResult: 20000,
            categories: {
              adhesions: { type: 'recette', total: 50000 },
              salaires: { type: 'depense', total: 30000 }
            }
          },
          bilanTrésorerie: [
            { accountId: 'current', initialBalance: 100000, finalBalance: 120000 },
            { accountId: 'savings', initialBalance: 200000, finalBalance: 200000 },
            { accountId: 'cash', initialBalance: 5000, finalBalance: 5000 }
          ]
        },
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true }
        ]
      }
    });

    expect(target.innerHTML).toContain("Rapport Financier pour l'Assemblée Générale");
    expect(target.innerHTML).toContain("Compte de Résultat");
    expect(target.innerHTML).toContain("500.00 €"); // totalRecettes
    expect(target.innerHTML).toContain("300.00 €"); // totalDepenses
    expect(target.innerHTML).toContain("200.00 €"); // netResult
    expect(target.innerHTML).toContain("1200.00 €"); // current final balance
  });
});
