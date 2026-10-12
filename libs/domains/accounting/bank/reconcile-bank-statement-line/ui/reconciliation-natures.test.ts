import { describe, it, expect } from 'vitest';
import { etiquetteDeProposition, libelleDEnregistrement, naturesDeLigne, natureProposee, parLeFormulaire, type ContexteDeNature } from './reconciliation-natures';
import type { BankStatementLine } from './reconciliation-types';

const ligne = (amount: number, aiSuggestions: string | null = null): BankStatementLine => ({
  id: 1, fitid: 'F', accountId: '1', amount, date: '2026-10-09', name: 'VIR', memo: null, status: 'pending', aiSuggestions
});

const RIEN: ContexteDeNature = {
  ecrituresExistantes: 0, facturesImpayees: 0, facturesAuMontant: 0, virementPossible: false, avancePossible: false
};

const natures = (line: BankStatementLine, ctx: Partial<ContexteDeNature> = {}) =>
  naturesDeLigne(line, { ...RIEN, ...ctx }).map((o) => o.nature);

describe('reconciliation-natures', () => {
  it('nomme la saisie selon le sens de la ligne', () => {
    expect(naturesDeLigne(ligne(5000), RIEN)[0].label).toBe('Recette');
    expect(naturesDeLigne(ligne(-5000), RIEN)[0].label).toBe('Dépense');
  });

  it("ne propose que ce que la ligne admet", () => {
    // Au crédit : pas de remboursement ; la facture et l'avance seulement quand elles existent.
    expect(natures(ligne(5000))).toEqual(['saisie', 'pointer']);
    expect(natures(ligne(5000), { facturesImpayees: 2, virementPossible: true, avancePossible: true })).toEqual([
      'saisie', 'pointer', 'facture', 'virement', 'avance'
    ]);
    // Au débit : le remboursement, jamais de facture ni d'avance.
    expect(natures(ligne(-5000), { facturesImpayees: 2, virementPossible: true, avancePossible: true })).toEqual([
      'saisie', 'pointer', 'remboursement', 'virement'
    ]);
  });

  it("présélectionne le pointage dès qu'une écriture existe, avant toute suggestion", () => {
    const virement = ligne(-5000, JSON.stringify({ kind: 'internal-transfer' }));
    expect(natureProposee(virement, { ...RIEN, ecrituresExistantes: 1, virementPossible: true })).toBe('pointer');
    expect(natureProposee(virement, { ...RIEN, virementPossible: true })).toBe('virement');
    // Un virement reconnu sans compte d'en face ne peut pas s'écrire d'ici.
    expect(natureProposee(virement, RIEN)).toBe('saisie');
    expect(natureProposee(ligne(5000), { ...RIEN, facturesImpayees: 1, facturesAuMontant: 1 })).toBe('facture');
    expect(natureProposee(ligne(5000), RIEN)).toBe('saisie');
  });

  it('marque une seule nature comme proposée, et compte les écritures existantes', () => {
    const options = naturesDeLigne(ligne(5000), { ...RIEN, ecrituresExistantes: 3 });
    expect(options.filter((o) => o.proposee).map((o) => o.nature)).toEqual(['pointer']);
    expect(options.find((o) => o.nature === 'pointer')?.label).toBe('Déjà saisie (3)');
  });

  it('dit ce que fait le bouton qui enregistre', () => {
    expect(libelleDEnregistrement('saisie', ligne(5000))).toBe('Enregistrer la recette');
    expect(libelleDEnregistrement('saisie', ligne(-5000))).toBe('Enregistrer la dépense');
    expect(libelleDEnregistrement('saisie', ligne(5000), true)).toBe('Enregistrer la ventilation');
    expect(libelleDEnregistrement('avance', ligne(5000))).toBe("Enregistrer l'avance");
    expect(parLeFormulaire('remboursement')).toBe(true);
    expect(parLeFormulaire('virement')).toBe(false);
  });
});

describe('etiquetteDeProposition', () => {
  it("nomme la nature proposée, et rien quand il n'y a pas de proposition", () => {
    expect(etiquetteDeProposition(ligne(5000), RIEN)).toBeNull();
    expect(etiquetteDeProposition(ligne(5000, JSON.stringify({ category: 1 })), RIEN)).toBe('Recette');
    expect(etiquetteDeProposition(ligne(-5000), { ...RIEN, ecrituresExistantes: 2 })).toBe('Déjà saisie');
    expect(
      etiquetteDeProposition(ligne(-5000, JSON.stringify({ kind: 'internal-transfer' })), { ...RIEN, virementPossible: true })
    ).toBe('Virement entre nos comptes');
  });
});
