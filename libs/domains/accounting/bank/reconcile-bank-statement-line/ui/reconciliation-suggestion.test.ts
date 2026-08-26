import { describe, it, expect } from 'vitest';
import { parseSuggestion, isOneClickValidatable, buildSuggestionRequest } from './reconciliation-suggestion';
import type { BankStatementLine } from './reconciliation-types';

const line = (suggestion: any, over: Record<string, any> = {}): BankStatementLine => ({
  id: 1, fitid: 'F1', accountId: 'current', amount: 15000, amountCents: 15000,
  date: '2026-08-20', name: 'VIR DUPONT JEAN', memo: 'Cotisation 26-27', status: 'pending',
  aiSuggestions: suggestion === null ? null : JSON.stringify(suggestion),
  ...over
});

describe('parseSuggestion', () => {
  it('rend null sur une ligne sans suggestion', () => {
    expect(parseSuggestion(line(null))).toBeNull();
  });

  it('rend null sur un JSON illisible plutôt que de lever', () => {
    expect(parseSuggestion(line(null, { aiSuggestions: '{cassé' }))).toBeNull();
  });
});

describe('isOneClickValidatable', () => {
  it('accepte une suggestion complète', () => {
    expect(isOneClickValidatable({ category: 5, memberId: 42 })).toBe(true);
  });

  /*
    Un virement interne s'écrit en DEUX jambes, une par compte. Le geste unitaire le refusait déjà
    et renvoyait au grand livre ; le lot, lui, l'aurait enregistré comme une recette ordinaire.
  */
  it('refuse un virement interne', () => {
    expect(isOneClickValidatable({ kind: 'internal-transfer', category: 5 })).toBe(false);
  });

  it('refuse une suggestion sans catégorie', () => {
    expect(isOneClickValidatable({ category: null, memberId: 42 })).toBe(false);
    expect(isOneClickValidatable({ memberId: 42 })).toBe(false);
  });

  it('refuse une suggestion absente', () => {
    expect(isOneClickValidatable(null)).toBe(false);
  });
});

describe('buildSuggestionRequest', () => {
  /*
    Le lot ne transmettait ni `accrualType`, ni `accrualNote`, ni `targetSeason` : une cotisation
    encaissée d'avance y devenait une écriture ordinaire rattachée à l'exercice consulté — soit
    l'erreur même que le cut-off est là pour empêcher.
  */
  it("transmet le rattachement d'exercice de la suggestion", () => {
    const req = buildSuggestionRequest(
      line({ category: 5, memberId: 42, accrualType: 'produit_constate_avance', accrualNote: 'Cotisation 26-27', targetSeason: '26-27' }),
      '25-26'
    );

    expect(req!.transaction).toMatchObject({
      seasonId: '26-27',
      accrualType: 'produit_constate_avance',
      accrualNote: 'Cotisation 26-27'
    });
  });

  it("retombe sur l'exercice consulté quand la suggestion n'en nomme aucun", () => {
    const req = buildSuggestionRequest(line({ category: 5 }), '25-26');
    expect(req!.transaction.seasonId).toBe('25-26');
    expect(req!.transaction.accrualType).toBe('normal');
  });

  it('déduit le sens du signe du montant', () => {
    expect(buildSuggestionRequest(line({ category: 5 }), '25-26')!.transaction.type).toBe('recette');
    expect(buildSuggestionRequest(line({ category: 5 }, { amount: -8840, amountCents: -8840 }), '25-26')!.transaction).toMatchObject({
      type: 'depense',
      amount: 8840
    });
  });

  it('rend null là où le geste ne peut pas être automatique', () => {
    expect(buildSuggestionRequest(line({ kind: 'internal-transfer', category: 5 }), '25-26')).toBeNull();
    expect(buildSuggestionRequest(line({ memberId: 42 }), '25-26')).toBeNull();
    expect(buildSuggestionRequest(line(null), '25-26')).toBeNull();
  });

  it("ne rattache aucun adhérent quand la suggestion n'en désigne pas", () => {
    expect(buildSuggestionRequest(line({ category: 5 }), '25-26')!.memberId).toBeNull();
  });
});
