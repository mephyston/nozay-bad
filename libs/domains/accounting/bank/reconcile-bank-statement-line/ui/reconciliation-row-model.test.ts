import { describe, it, expect, vi } from 'vitest';
import type { BankStatementLine } from './reconciliation.svelte';
import { gestesDeLigne, ligneDeReleve, montantCents, propositionDe } from './reconciliation-row-model';

const CATEGORIES = [
  { id: '7', name: 'Cotisations' },
  { id: '12', name: 'Achats volants' }
];

const ETAT = {
  ecrituresExistantes: [] as { date: string; description: string }[],
  virementPossible: false,
  adherentePossible: false,
  categories: CATEGORIES,
  isClosed: false
};

function ligne(surcharges: Partial<BankStatementLine> = {}): BankStatementLine {
  return {
    id: 1,
    accountId: 1,
    date: '2026-09-12',
    name: 'VIR INST RE 675386430923',
    memo: 'DE: MR DUPONT',
    amount: 4500,
    fitid: 'X1',
    status: 'pending',
    ...surcharges
  } as BankStatementLine;
}

/** Une suggestion telle que le modèle la dépose sur la ligne. */
const avecSuggestion = (s: Record<string, unknown>) => ({ aiSuggestions: JSON.stringify(s) });

describe('propositionDe', () => {
  it("fait passer l'écriture existante avant toute suggestion", () => {
    /*
      La règle qui compte : si les livres portent déjà l'opération, on pointe, on ne crée
      pas. Proposer « Valider » sur une telle ligne double la recette sans que rien ne le
      signale — c'est arrivé, sur 60,07 € de licence.
    */
    const p = propositionDe(ligne(avecSuggestion({ category: 7, confidence: 0.9 })), {
      ...ETAT,
      ecrituresExistantes: [{ date: '2026-09-10', description: 'Cotisation Dupont' }]
    });
    expect(p.texte).toBe('Une écriture existante correspond');
    expect(p.precision).toBe('2026-09-10 · Cotisation Dupont');
    expect(p.ton).toBe('success');
  });

  it('accorde le pluriel quand plusieurs écritures correspondent', () => {
    const p = propositionDe(ligne(), {
      ...ETAT,
      ecrituresExistantes: [
        { date: '2026-09-10', description: 'A' },
        { date: '2026-09-11', description: 'B' }
      ]
    });
    expect(p.texte).toBe('2 écritures existantes correspondent');
  });

  it('nomme la catégorie proposée, l’adhérent et le cut-off', () => {
    const p = propositionDe(
      ligne(avecSuggestion({ category: 7, memberName: 'Dupont Jean', accrualType: 'produit_constate_avance', targetSeason: '26-27' })),
      ETAT
    );
    expect(p.texte).toBe('Cotisations');
    expect(p.precision).toBe("Dupont Jean · Produit constaté d'avance — 26-27");
  });

  it("dit qu'une catégorie reste à choisir plutôt que d'afficher un identifiant", () => {
    expect(propositionDe(ligne(avecSuggestion({ memberName: 'Dupont Jean' })), ETAT).texte).toBe(
      'Catégorie à choisir'
    );
    // Une catégorie que la liste ne connaît pas ne s'affiche pas en numéro non plus.
    expect(propositionDe(ligne(avecSuggestion({ category: 999 })), ETAT).texte).toBe('Catégorie à choisir');
  });

  it('renvoie le virement interne vers le geste qui sait l’écrire en deux jambes', () => {
    const possible = propositionDe(ligne(avecSuggestion({ kind: 'internal-transfer' })), {
      ...ETAT,
      virementPossible: true
    });
    expect(possible.texte).toBe('Virement interne');
    expect(possible.precision).toContain('deux jambes');

    const impossible = propositionDe(ligne(avecSuggestion({ kind: 'internal-transfer' })), ETAT);
    expect(impossible.precision).toContain('grand livre');
  });

  it('assume l’absence de proposition au lieu de laisser un vide', () => {
    expect(propositionDe(ligne(), ETAT)).toEqual({ texte: 'Aucune proposition — à saisir', ton: 'muted' });
  });

  it('une ligne déjà rapprochée ne propose plus rien', () => {
    expect(propositionDe(ligne({ status: 'reconciled' }), ETAT).texte).toBe('Rapprochée');
  });
});

describe('ligneDeReleve', () => {
  it('oppose le fait bancaire à sa proposition, en deux lignes', () => {
    const l = ligneDeReleve(ligne(avecSuggestion({ category: 7, memberName: 'Dupont Jean' })), ETAT);
    expect(l).toEqual({
      titre: 'VIR INST RE 675386430923',
      sousTitre: 'Cotisations',
      precision: 'Dupont Jean',
      valeur: '+45,00 €',
      ton: 'success',
      legende: '2026-09-12'
    });
  });

  it('colore le montant selon son sens, et lit les deux formes du relais', () => {
    expect(ligneDeReleve(ligne({ amount: -4500 }), ETAT).ton).toBe('destructive');
    expect(montantCents(ligne())).toBe(4500);
    expect(montantCents(ligne({ amountCents: 990 } as never))).toBe(990);
  });
});

describe('gestesDeLigne', () => {
  const gestes = {
    onValider: vi.fn(),
    onPointer: vi.fn(),
    onVirement: vi.fn(),
    onAdherente: vi.fn(),
    onOuvrir: vi.fn()
  };

  it('met « Pointer » en tête quand une écriture existe, et jamais « Valider »', () => {
    const actions = gestesDeLigne(
      ligne(avecSuggestion({ category: 7, confidence: 0.95 })),
      { ...ETAT, ecrituresExistantes: [{ date: '2026-09-10', description: 'A' }] },
      gestes
    );
    expect(actions[0].label).toBe('Pointer');
    expect(actions.map((a) => a.id)).not.toContain('valider');
  });

  it('propose les gestes de virement, puis le chemin vers la fiche', () => {
    const actions = gestesDeLigne(
      ligne(avecSuggestion({ kind: 'internal-transfer' })),
      { ...ETAT, virementPossible: true, adherentePossible: true },
      gestes
    );
    expect(actions.map((a) => a.label)).toEqual(['Virement', 'Adhérente', 'Modifier']);
  });

  it("n'offre que la consultation sur une ligne déjà rapprochée", () => {
    const actions = gestesDeLigne(ligne({ status: 'reconciled' }), ETAT, gestes);
    expect(actions.map((a) => a.label)).toEqual(['Voir le détail']);
  });

  it('ne propose plus rien sur une saison clôturée', () => {
    expect(gestesDeLigne(ligne(), { ...ETAT, isClosed: true }, gestes)).toEqual([]);
  });
});
