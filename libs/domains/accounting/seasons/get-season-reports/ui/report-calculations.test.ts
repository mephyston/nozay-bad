import { describe, it, expect } from 'vitest';
import {
  getClassCategories,
  getClassSumRealise,
  getCatTotal,
  getUnclassifiedCategories,
  getTotalDepensesRealise,
  getTotalRecettesRealise,
  UNCLASSIFIED_CLASS_CODE
} from './report-calculations';
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

describe('ce qu\'aucune classe de compte ne réclame', () => {
  /*
   * Le compte de résultat somme les **classes de compte**, pas les catégories. Toute catégorie
   * sans classe du côté considéré n'appartenait donc à aucune colonne, et son montant disparaissait
   * du total sans un mot — pendant que le bilan analytique, qui énumère les catégories, le comptait.
   * D'où deux « résultats de l'exercice » qui ne tombaient pas juste, sur les mêmes données.
   *
   * Le cas réel qui l'a fait apparaître : sept remboursements de cotisation imputés à
   * « Adhésions & Inscriptions », catégorie qui n'a de classe qu'en produit.
   */
  const categories: DbCategory[] = [
    { id: 1, adminLabel: 'Adhésions & Inscriptions', adherentLabel: 'Adhésions', hideInExpenses: false, receiptAccountClassId: 1, expenseAccountClassId: null },
    { id: 8, adminLabel: 'Volants', adherentLabel: 'Volants', hideInExpenses: false, receiptAccountClassId: 1, expenseAccountClassId: 4 },
    { id: 9, adminLabel: 'Licences FFBaD', adherentLabel: 'Licences', hideInExpenses: false, receiptAccountClassId: null, expenseAccountClassId: 8 }
  ];

  const accountClasses: AccountClass[] = [
    { id: 1, code: '70', label: '70 - Ventes', type: 'recette' },
    { id: 4, code: '60', label: '60 - Achats', type: 'depense' },
    { id: 8, code: '65', label: '65 - Autres charges', type: 'depense' }
  ];

  const report: ReportData = {
    compteResultat: {
      totalRecettes: 0,
      totalDepenses: 0,
      netResult: 0,
      categories: {
        '1_recette': { type: 'recette', total: 8_723_108 },
        '1_depense': { type: 'depense', total: 72_594 },   // les remboursements de cotisation
        '8_depense': { type: 'depense', total: 1_000_000 },
        '9_recette': { type: 'recette', total: 150_000 },  // des licences refacturées
        '9_depense': { type: 'depense', total: 3_000_000 },
        'divers_depense': { type: 'depense', total: 5_000 } // une écriture sans catégorie du tout
      }
    },
    bilanTrésorerie: []
  };

  /** Le total du bilan analytique : toutes les catégories, sans regard sur les classes. */
  const analyticTotal = (type: 'recette' | 'depense') =>
    categories.reduce((sum, cat) => sum + getCatTotal(report, null, cat.id.toString(), type, 'realise'), 0)
    + getCatTotal(report, null, 'divers', type, 'realise');

  it('recense les catégories sans classe du côté demandé', () => {
    expect(getUnclassifiedCategories(categories, 'depense', accountClasses).map(c => c.id)).toEqual([1]);
    expect(getUnclassifiedCategories(categories, 'recette', accountClasses).map(c => c.id)).toEqual([9]);
  });

  it('y range aussi les écritures sans catégorie, que personne ne lisait', () => {
    // La clé `divers_depense` pesait sur les totaux du serveur et ne s'affichait nulle part.
    const unclassified = getClassSumRealise(categories, report, null, UNCLASSIFIED_CLASS_CODE, 'depense', 'realise', accountClasses);
    expect(unclassified).toBe(72_594 + 5_000);
  });

  it('fait tomber le compte de résultat juste avec le bilan analytique', () => {
    const depenses = getTotalDepensesRealise(accountClasses, categories, report, null, 'realise');
    const recettes = getTotalRecettesRealise(accountClasses, categories, report, null, 'realise');

    expect(depenses).toBe(analyticTotal('depense'));
    expect(recettes).toBe(analyticTotal('recette'));
    expect(recettes - depenses).toBe(analyticTotal('recette') - analyticTotal('depense'));
  });

  it("ne compte rien deux fois : une catégorie classée reste dans sa seule classe", () => {
    const dansUneClasse = getClassSumRealise(categories, report, null, '60', 'depense', 'realise', accountClasses)
      + getClassSumRealise(categories, report, null, '65', 'depense', 'realise', accountClasses);
    const residu = getClassSumRealise(categories, report, null, UNCLASSIFIED_CLASS_CODE, 'depense', 'realise', accountClasses);

    expect(dansUneClasse).toBe(1_000_000 + 3_000_000);
    expect(dansUneClasse + residu).toBe(getTotalDepensesRealise(accountClasses, categories, report, null, 'realise'));
  });
});

describe('catégories désactivées dans le résidu', () => {
  const accountClasses: AccountClass[] = [
    { id: 4, code: '60', label: '60 - Achats', type: 'depense' }
  ];
  const morte = { id: 15, adminLabel: 'Virements Internes', adherentLabel: 'Virement', hideInExpenses: true, receiptAccountClassId: null, expenseAccountClassId: null, active: false } as DbCategory;
  const vivante = { id: 16, adminLabel: 'Divers', adherentLabel: 'Divers', hideInExpenses: false, receiptAccountClassId: null, expenseAccountClassId: null } as DbCategory;

  const rapportVide: ReportData = { compteResultat: { totalRecettes: 0, totalDepenses: 0, netResult: 0, categories: {} }, bilanTrésorerie: [] };
  const rapportAvecMontant: ReportData = {
    compteResultat: { totalRecettes: 0, totalDepenses: 0, netResult: 0, categories: { '15_depense': { type: 'depense', total: 4_200 } } },
    bilanTrésorerie: []
  };

  it("écarte une catégorie désactivée qui ne porte rien — pas de champ de budget pour une catégorie morte", () => {
    const ids = getUnclassifiedCategories([morte, vivante], 'depense', accountClasses, rapportVide).map(c => c.id);
    expect(ids).toEqual([16]);
  });

  it("garde une catégorie désactivée qui porte encore un montant, sans quoi il disparaîtrait du total", () => {
    const ids = getUnclassifiedCategories([morte, vivante], 'depense', accountClasses, rapportAvecMontant).map(c => c.id);
    expect(ids).toEqual([15, 16]);
  });

  it('écarte les catégories mortes en mode budget, où aucun rapport n\'est fourni', () => {
    expect(getUnclassifiedCategories([morte, vivante], 'depense', accountClasses).map(c => c.id)).toEqual([16]);
  });
});
