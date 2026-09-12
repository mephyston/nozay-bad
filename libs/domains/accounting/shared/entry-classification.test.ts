import { describe, it, expect } from 'vitest';
import { affectsProfitAndLoss, countsInProfitAndLossAsOf, resolveLegacyTransferCategoryId } from './entry-classification';

const VIREMENT_CAT = 42;
const CUTOFF = '2026-08-31';

describe('countsInProfitAndLossAsOf', () => {
  it("compte une écriture normale datée au plus tard à l'arrêté", () => {
    expect(countsInProfitAndLossAsOf({ type: 'recette', date: '2026-08-31', accrualType: 'normal' }, CUTOFF)).toBe(true);
    expect(countsInProfitAndLossAsOf({ type: 'depense', date: '2025-09-01', accrualType: null }, CUTOFF)).toBe(true);
  });

  it("écarte une écriture normale datée après l'arrêté (reste-à-réaliser)", () => {
    expect(countsInProfitAndLossAsOf({ type: 'recette', date: '2026-09-01', accrualType: 'normal' }, CUTOFF)).toBe(false);
  });

  it("compte une charge à payer ou un produit à recevoir quelle que soit sa date", () => {
    // Cas de prod du 12/09/2026 : URSSAF et volants de 25-26 datés de septembre et d'octobre,
    // absents du compte de résultat de 25-26 arrêté au 31/08.
    expect(countsInProfitAndLossAsOf({ type: 'depense', date: '2026-10-15', accrualType: 'charge_a_payer' }, CUTOFF)).toBe(true);
    expect(countsInProfitAndLossAsOf({ type: 'recette', date: '2026-11-02', accrualType: 'produit_a_recevoir' }, CUTOFF)).toBe(true);
    // Et même arrêtée en cours d'exercice : l'engagement est acquis.
    expect(countsInProfitAndLossAsOf({ type: 'depense', date: '2026-10-15', accrualType: 'charge_a_payer' }, '2026-06-30')).toBe(true);
  });

  it("n'exempte pas les constatés d'avance de la borne de date", () => {
    // Datés avant l'exercice par construction : la borne ne les gêne jamais, et une date
    // postérieure à l'arrêté serait une incohérence, pas un motif d'inclusion.
    expect(countsInProfitAndLossAsOf({ type: 'recette', date: '2026-06-25', accrualType: 'produit_constate_avance' }, '2026-06-30')).toBe(true);
    expect(countsInProfitAndLossAsOf({ type: 'recette', date: '2026-07-02', accrualType: 'produit_constate_avance' }, '2026-06-30')).toBe(false);
  });

  it("reste subordonné à affectsProfitAndLoss : un virement ne compte jamais", () => {
    expect(countsInProfitAndLossAsOf({ type: 'transfert', date: '2026-01-01', accrualType: 'normal' }, CUTOFF)).toBe(false);
    expect(countsInProfitAndLossAsOf({ type: 'depense', categoryId: VIREMENT_CAT, date: '2026-01-01', accrualType: 'normal' }, CUTOFF, VIREMENT_CAT)).toBe(false);
    // Même une « charge à payer » posée par erreur sur la catégorie héritée.
    expect(countsInProfitAndLossAsOf({ type: 'depense', categoryId: VIREMENT_CAT, date: '2026-10-01', accrualType: 'charge_a_payer' }, CUTOFF, VIREMENT_CAT)).toBe(false);
  });
});

describe('affectsProfitAndLoss', () => {
  it('exclut les deux formes de virement interne et rien d’autre', () => {
    expect(affectsProfitAndLoss({ type: 'transfert' })).toBe(false);
    expect(affectsProfitAndLoss({ type: 'depense', categoryId: VIREMENT_CAT }, VIREMENT_CAT)).toBe(false);
    expect(affectsProfitAndLoss({ type: 'depense', categoryId: VIREMENT_CAT })).toBe(true);
    expect(affectsProfitAndLoss({ type: 'recette', categoryId: 7 }, VIREMENT_CAT)).toBe(true);
  });
});

describe('resolveLegacyTransferCategoryId', () => {
  it('reconnaît la catégorie au libellé, quelle que soit la casse', () => {
    expect(resolveLegacyTransferCategoryId([
      { id: 1, adminLabel: 'Adhésions' },
      { id: 2, adminLabel: 'virements internes' }
    ])).toBe(2);
    expect(resolveLegacyTransferCategoryId([{ id: 1, adminLabel: 'Adhésions' }])).toBeUndefined();
  });
});
