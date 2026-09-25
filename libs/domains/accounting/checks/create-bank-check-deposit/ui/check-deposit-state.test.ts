import { describe, it, expect } from 'vitest';
import { createCheckDepositState } from './check-deposit-state.svelte';
import type { Check } from './check-deposit-types';

const base = {
  seasonId: '25-26',
  seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
  checks: [] as Check[],
  checkDeposits: [],
  members: [{ id: 12, licence: '07123456', lastName: 'DURAND', firstName: 'Marie', parent1Name: null, parent2Name: null }],
  categories: [
    { id: 1, adminLabel: 'Adhésions', receiptCode: '756', receiptAccountClassId: 10, active: true },
    { id: 2, adminLabel: 'Dons', receiptCode: '754', receiptAccountClassId: 11, active: true },
    { id: 3, adminLabel: 'Salaires', receiptCode: null, receiptAccountClassId: null, active: true },
    { id: 4, adminLabel: 'Buvette', receiptCode: '707', receiptAccountClassId: 12, active: false }
  ],
  pendingBankTransactions: []
};

const cheque: Check = {
  id: 7, checkDepositId: null, seasonId: '25-26', number: '1234567', amount: 4250, emitter: 'Marie Durand',
  bank: 'LCL', memberId: 12, ledgerEntryId: 99, status: 'received', photoUrl: null, plannedDepositMonth: null,
  createdAt: '2026-08-20T10:00:00.000Z', date: '2026-08-01', categoryId: 2, memberName: 'DURAND Marie', memberLicence: '07123456'
};

describe('check-deposit-state — formulaire de chèque', () => {
  it('prérenseigne le formulaire depuis la ligne, date et catégorie comprises', () => {
    const s = createCheckDepositState(() => base);

    s.openEditCheck(cheque);

    expect(s.showAddCheckModal).toBe(true);
    expect(s.editingCheckId).toBe(7);
    expect(s.checkNumber).toBe('1234567');
    expect(s.checkAmount).toBe('42.5');
    expect(s.checkEmitter).toBe('Marie Durand');
    expect(s.checkBank).toBe('LCL');
    expect(s.checkMemberId).toBe('12');
    expect(s.checkCategory).toBe('2');
    expect(s.checkDate).toBe('2026-08-01');
  });

  it("retombe sur la date d'enregistrement et laisse la catégorie à choisir pour un chèque sans recette liée", () => {
    const s = createCheckDepositState(() => base);

    s.openEditCheck({ ...cheque, ledgerEntryId: null, date: null, categoryId: null, bank: null, memberId: null });

    expect(s.checkDate).toBe('2026-08-20');
    expect(s.checkCategory).toBe('');
    expect(s.checkBank).toBe('');
    expect(s.checkMemberId).toBe('');
  });

  it("ouvrir la création après une modification repart d'un formulaire vierge", () => {
    const s = createCheckDepositState(() => base);
    s.openEditCheck(cheque);
    s.formError = 'Refusé';

    s.openCreateCheck();

    expect(s.showAddCheckModal).toBe(true);
    expect(s.editingCheckId).toBeNull();
    expect(s.checkNumber).toBe('');
    expect(s.checkAmount).toBe('');
    expect(s.checkMemberId).toBe('');
    expect(s.checkCategory).toBe('');
    expect(s.formError).toBe('');
  });

  it('propose les catégories de recette actives du plan, et elles seules', () => {
    const s = createCheckDepositState(() => base);
    s.openCreateCheck();

    expect(s.categoryItems.map((c) => c.label)).toEqual(['Adhésions', 'Dons']);
  });

  it("garde la catégorie désactivée d'un chèque déjà saisi, pour ne pas l'effacer en le modifiant", () => {
    const s = createCheckDepositState(() => base);

    s.openEditCheck({ ...cheque, categoryId: 4 });

    expect(s.categoryItems.map((c) => c.label)).toEqual(['Adhésions', 'Dons', 'Buvette']);
  });

  it("propose les adhérents par nom, licence à l'appui et parents en seconde ligne, pour l'écran de choix", () => {
    const s = createCheckDepositState(() => ({
      ...base,
      members: [
        ...base.members,
        { id: 3, licence: '07000003', lastName: 'ALLARD', firstName: 'Léo', parent1Name: 'Camille Allard', parent2Name: null }
      ]
    }));

    expect(s.memberItems).toEqual([
      { value: '3', label: 'ALLARD Léo (07000003)', hint: 'Camille Allard' },
      { value: '12', label: 'DURAND Marie (07123456)', hint: undefined }
    ]);
  });
});
