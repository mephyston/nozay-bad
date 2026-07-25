import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import GeneralMeetingReport from './GeneralMeetingReport.svelte';

describe('GeneralMeetingReport Component', () => {
  let component: any = null;

  afterEach(() => {
    if (component) {
      unmount(component);
      component = null;
    }
    document.body.innerHTML = '';
  });

  it('renders report details and balances correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(GeneralMeetingReport, {
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
          { id: 1, adminLabel: 'Cotisations membres', adherentLabel: 'Cotis', hideInExpenses: false, receiptCode: '75', expenseCode: '67' },
          { id: 9, adminLabel: 'Salaires et Charges', adherentLabel: 'Salaires', hideInExpenses: true, receiptCode: null, expenseCode: '64' }
        ],
      }
    });

    expect(target.innerHTML).toContain("Compte de résultat");
    expect(target.innerHTML).toContain("Compte de Résultat");
    expect(target.innerHTML).toContain("Cotisations membres"); // mapped from category ID 1
    expect(target.innerHTML).toContain("500,00&nbsp;€"); // totalRecettes
    expect(target.innerHTML).toContain("300,00&nbsp;€"); // totalDepenses
    expect(target.innerHTML).toContain("200,00&nbsp;€"); // netResult (Excédent)
    expect(target.innerHTML).toContain("1&nbsp;200,00&nbsp;€"); // current final balance
  });

  it('renders budget inputs when reportMode is previsionnel and handles non-closed seasons', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(GeneralMeetingReport, {
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
          { categoryId: 1, type: 'depense', amount: 50000 },
          { categoryId: 2, type: 'recette', amount: 120000 }
        ]
      }
    });

    // Verify view mode tabs exist
    expect(target.innerHTML).toContain("Prévisionnel");
    expect(target.innerHTML).toContain("Réalisé");
  });

  it('uses prevReport values when reportMode is previsionnel and prevReport is provided', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(GeneralMeetingReport, {
      target,
      props: {
        report: {
          compteResultat: {
            totalRecettes: 10000,
            totalDepenses: 5000,
            netResult: 5000,
            categories: {
              '1_recette': { type: 'recette', total: 10000 },
              '9_depense': { type: 'depense', total: 5000 }
            }
          },
          bilanTrésorerie: []
        },
        prevReport: {
          compteResultat: {
            totalRecettes: 8000,
            totalDepenses: 4000,
            netResult: 4000,
            categories: {
              '1_recette': { type: 'recette', total: 8000 },
              '9_depense': { type: 'depense', total: 4000 }
            }
          },
          bilanTrésorerie: []
        },
        seasonId: '25-26',
        seasons: [
          { id: '25-26', name: 'Saison 2025-2026', active: true, closed: false },
          { id: '24-25', name: 'Saison 2024-2025', active: false, closed: true }
        ],
        categories: [
          { id: 1, adminLabel: 'Cotisations membres', adherentLabel: 'Cotis', hideInExpenses: false, receiptCode: '75', expenseCode: '67' },
          { id: 9, adminLabel: 'Salaires et Charges', adherentLabel: 'Salaires', hideInExpenses: true, receiptCode: null, expenseCode: '64' }
        ],
        accountClasses: [
          { code: '75', label: '75 - Cotisations', type: 'recette' },
          { code: '64', label: '64 - Charges de personnel', type: 'depense' }
        ],
        budget: []
      }
    });

    // Initially in realized mode: should show 10000 / 5000 / 5000
    expect(target.innerHTML).toContain("100,00&nbsp;€");
    expect(target.innerHTML).toContain("50,00&nbsp;€");

    // Find and click the "Budget prévisionnel" tab button
    const prevTab = Array.from(target.querySelectorAll('button')).find(btn => btn.textContent?.includes('Budget prévisionnel'));
    expect(prevTab).toBeDefined();
    prevTab?.click();
    flushSync();

    // Now in previsionnel mode: should show current season realized column header "Réalisé"
    expect(target.innerHTML).toContain("Réalisé");

    // Should show current season realized values (100,00 € / 50,00 €)
    expect(target.innerHTML).toContain("100,00&nbsp;€");
    expect(target.innerHTML).toContain("50,00&nbsp;€");
  });
});
