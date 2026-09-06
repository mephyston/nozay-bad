import { describe, it, expect } from 'vitest';
import { createCheckDepositState } from './check-deposit-state.svelte';
import type { Check } from './check-deposit-types';

const base = {
  seasonId: '25-26',
  seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
  checks: [] as Check[],
  checkDeposits: [],
  members: [{ id: 12, licence: '07123456', lastName: 'DURAND', firstName: 'Marie', parent1Name: null, parent2Name: null }],
  pendingBankTransactions: []
};

const cheque: Check = {
  id: 7, checkDepositId: null, seasonId: '25-26', number: '1234567', amount: 4250, emitter: 'Marie Durand',
  bank: 'LCL', memberId: 12, ledgerEntryId: 99, status: 'received', photoUrl: null,
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
    expect(s.memberDisplayVal).toBe('DURAND Marie (07123456)');
    expect(s.checkCategory).toBe('2');
    expect(s.categoryDisplayVal).toBe('Vente');
    expect(s.checkDate).toBe('2026-08-01');
  });

  it("retombe sur la date d'enregistrement et l'adhésion pour un chèque sans recette liée", () => {
    const s = createCheckDepositState(() => base);

    s.openEditCheck({ ...cheque, ledgerEntryId: null, date: null, categoryId: null, bank: null, memberId: null });

    expect(s.checkDate).toBe('2026-08-20');
    expect(s.checkCategory).toBe('1');
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
    expect(s.checkCategory).toBe('1');
    expect(s.formError).toBe('');
  });
});
