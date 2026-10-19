import { describe, it, expect } from 'vitest';
import { ExpensesState } from './expenses-state.svelte';
import type { Expense } from './expenses-types';

describe('ExpensesState.startEdit', () => {
  it("prépare des identifiants en chaînes, même quand l'API les rend en entiers", () => {
    const state = new ExpensesState();
    // Forme réelle d'une note relayée par l'admin : `seasonId` et `category` numériques.
    const note = {
      id: 7,
      seasonId: 2,
      description: 'Fromage à raclette',
      category: 14,
      amount: 4250,
      photoUrl: null,
      status: 'pending',
      emitterName: 'Jean Dupont',
      memberId: null,
      ledgerEntryId: null,
      createdAt: '2026-10-01'
    } as unknown as Expense;

    state.startEdit(note);

    expect(state.editSeasonId).toBe('2');
    expect(state.editCategory).toBe('14');
    expect(state.editAmountStr).toBe('42.50');
  });
});
