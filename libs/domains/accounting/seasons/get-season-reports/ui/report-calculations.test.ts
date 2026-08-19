import { describe, it, expect } from 'vitest';
import { getClassCategories, getClassSumRealise, getCatTotal } from './report-calculations';
import type { DbCategory, AccountClass, ReportData } from './report-types';

describe('report-calculations', () => {
  const categories: DbCategory[] = [
    { id: 1, adminLabel: 'Adhésions & Inscriptions', adherentLabel: 'Adhésions', hideInExpenses: false, receiptAccountClassId: 1, expenseAccountClassId: null },
    { id: 3, adminLabel: 'Subventions', adherentLabel: 'Subventions', hideInExpenses: false, receiptAccountClassId: 2, expenseAccountClassId: null },
    { id: 8, adminLabel: 'Volants', adherentLabel: 'Volants', hideInExpenses: false, receiptAccountClassId: 1, expenseAccountClassId: 4 },
    { id: 9, adminLabel: 'Salaires et Charges', adherentLabel: 'Salaires', hideInExpenses: false, receiptAccountClassId: null, expenseAccountClassId: 8 }
  ];

  const accountClasses: AccountClass[] = [
    { id: 1, code: '70', label: '70 - Ventes', type: 'recette' },
    { id: 2, code: '74', label: '74 - Subventions', type: 'recette' },
    { id: 4, code: '60', label: '60 - Achats', type: 'depense' },
    { id: 8, code: '64', label: '64 - Personnel', type: 'depense' }
  ];

  const report: ReportData = {
    compteResultat: {
      totalRecettes: 6500000,
      totalDepenses: 4000000,
      netResult: 2500000,
      categories: {
        '1_recette': { type: 'recette', total: 4500000 },
        '3_recette': { type: 'recette', total: 2000000 },
        '8_depense': { type: 'depense', total: 1000000 },
        '9_depense': { type: 'depense', total: 3000000 }
      }
    },
    bilanTrésorerie: []
  };

  it('correctly filters categories by receipt and expense account class FK id', () => {
    const recettes70 = getClassCategories(categories, '70', 'recette', accountClasses);
    expect(recettes70.map(c => c.id)).toEqual([1, 8]);

    const recettes74 = getClassCategories(categories, '74', 'recette', accountClasses);
    expect(recettes74.map(c => c.id)).toEqual([3]);

    const depenses60 = getClassCategories(categories, '60', 'depense', accountClasses);
    expect(depenses60.map(c => c.id)).toEqual([8]);

    const depenses64 = getClassCategories(categories, '64', 'depense', accountClasses);
    expect(depenses64.map(c => c.id)).toEqual([9]);
  });

  it('correctly calculates class sums for realise mode', () => {
    const sumRecettes70 = getClassSumRealise(categories, report, null, '70', 'recette', 'realise', accountClasses);
    expect(sumRecettes70).toBe(4500000);

    const sumDepenses64 = getClassSumRealise(categories, report, null, '64', 'depense', 'realise', accountClasses);
    expect(sumDepenses64).toBe(3000000);
  });
});
