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
              '1_recette': { type: 'recette', total: 50000 },
              '9_depense': { type: 'depense', total: 30000 }
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
          { id: '25-26', name: 'Saison 2025-2026', active: true, closed: false }
        ],
        categories: [
          { id: 1, adminLabel: 'Cotisations membres', adherentLabel: 'Cotis', hideInExpenses: false, codeRecette: '75', codeDepense: '67' },
          { id: 9, adminLabel: 'Salaires et Charges', adherentLabel: 'Salaires', hideInExpenses: true, codeRecette: null, codeDepense: '64' }
        ],
      }
    });

    expect(target.innerHTML).toContain("Rapport Financier pour l'Assemblée Générale");
    expect(target.innerHTML).toContain("Compte de Résultat");
    expect(target.innerHTML).toContain("Cotisations membres"); // mapped from category ID 1
    expect(target.innerHTML).toContain("500,00 €"); // totalRecettes
    expect(target.innerHTML).toContain("300,00 €"); // totalDepenses
    expect(target.innerHTML).toContain("200,00 €"); // netResult (Excédent)
    expect(target.innerHTML).toContain("1 200,00 €"); // current final balance
  });

  it('renders budget inputs when reportMode is previsionnel and handles non-closed seasons', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(GeneralMeetingReport, {
      target,
      props: {
        report: {
          compteResultat: {
            totalRecettes: 0,
            totalDepenses: 0,
            netResult: 0,
            categories: {}
          },
          bilanTrésorerie: []
        },
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true, closed: false }
        ],
        categories: [],
        accountClasses: [
          { code: '60', label: '60 - Achats', type: 'depense' },
          { code: '70', label: '70 - Ventes', type: 'recette' }
        ],
        budget: [
          { classCode: '60', amount: 50000 },
          { classCode: '70', amount: 120000 }
        ]
      }
    });

    // Verify view mode tabs exist
    expect(target.innerHTML).toContain("Budget Prévisionnel");
    expect(target.innerHTML).toContain("Résultat Réalisé (Réel)");
  });
});
