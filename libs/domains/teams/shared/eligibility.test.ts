import { describe, it, expect } from 'vitest';
import { checkEligibility, isEligibleInDiscipline, eligibleDisciplines } from './eligibility';
import { CHAMPIONSHIP_RULES, getDivision } from './championship';
import type { PlayerRanking } from './player';
import type { Ranking } from './ranking';

function player(
  rankings: { s?: Ranking | null; d?: Ranking | null; m?: Ranking | null },
  category = 'Senior'
): PlayerRanking {
  return {
    licence: '00000001',
    lastName: 'TEST',
    firstName: 'Joueur',
    gender: 'H',
    category,
    mutation: 'none',
    singles: rankings.s ?? null,
    doubles: rankings.d ?? null,
    mixed: rankings.m ?? null,
    cpphSingles: null,
    cpphDoubles: null,
    cpphMixed: null
  };
}

describe('éligibilité — départemental masculin', () => {
  const masculin = CHAMPIONSHIP_RULES.icd_masculin;
  const d1 = getDivision('icd_masculin', 'D1')!;
  const d2 = getDivision('icd_masculin', 'D2')!;
  const d4 = getDivision('icd_masculin', 'D4')!;

  it("n'impose aucune limite en Division 1", () => {
    expect(checkEligibility(d1, masculin.categories, player({ s: 'N1' })).eligible).toBe(true);
  });

  it('plafonne à D7 dans la discipline jouée en D2 et D3 (art. 6.1.3)', () => {
    // L'exemple du règlement : R6/D7/R6 ne peut s'aligner qu'en double.
    const joueur = player({ s: 'R6', d: 'D7', m: 'R6' });

    expect(isEligibleInDiscipline(d2.eligibility, joueur, 'singles')).toBe(false);
    expect(isEligibleInDiscipline(d2.eligibility, joueur, 'doubles')).toBe(true);
    expect(isEligibleInDiscipline(d2.eligibility, joueur, 'mixed')).toBe(false);
    expect(eligibleDisciplines(d2.eligibility, joueur)).toEqual(['doubles']);
  });

  it('exige P10 maximum dans les TROIS disciplines en D4 « Promotion »', () => {
    // L'exemple du règlement : P11/P10/D9 ne peut pas participer, à cause du D9.
    expect(checkEligibility(d4, masculin.categories, player({ s: 'P11', d: 'P10', m: 'D9' })).eligible).toBe(false);
    expect(checkEligibility(d4, masculin.categories, player({ s: 'P11', d: 'P10', m: 'P12' })).eligible).toBe(true);
  });
});

describe('éligibilité — départemental vétérans', () => {
  const veterans = CHAMPIONSHIP_RULES.icd_veterans;
  const d1 = getDivision('icd_veterans', 'D1')!;
  const d2 = getDivision('icd_veterans', 'D2')!;

  it('plafonne à R6 en D1 dans la discipline jouée', () => {
    // L'exemple du règlement : R5/R6/D7 ne peut jouer qu'en double et en mixte.
    const joueur = player({ s: 'R5', d: 'R6', m: 'D7' }, 'Veteran 2');

    expect(eligibleDisciplines(d1.eligibility, joueur)).toEqual(['doubles', 'mixed']);
  });

  it('plafonne à D9 en D2', () => {
    // L'exemple du règlement : P10/D8/D9 ne peut jouer qu'en simple et en mixte.
    const joueuse = player({ s: 'P10', d: 'D8', m: 'D9' }, 'Veteran 1');

    expect(eligibleDisciplines(d2.eligibility, joueuse)).toEqual(['singles', 'mixed']);
  });

  it("refuse un joueur qui n'est pas vétéran", () => {
    const verdict = checkEligibility(d1, veterans.categories, player({ s: 'D9' }, 'Senior'));

    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toContain('Senior');
  });

  it('admet toutes les catégories vétérans, de V1 à V8', () => {
    for (const category of ['Veteran 1', 'Veteran 5', 'Veteran 8']) {
      expect(checkEligibility(d1, veterans.categories, player({ s: 'D9' }, category)).eligible).toBe(true);
    }
  });
});

describe('éligibilité — régional', () => {
  const icr = CHAMPIONSHIP_RULES.icr_seniors;
  const pn = getDivision('icr_seniors', 'PN')!;
  const r1 = getDivision('icr_seniors', 'R1')!;
  const r3 = getDivision('icr_seniors', 'R3')!;

  it('exige au moins D9 en Pré-Nationale, dans la discipline jouée', () => {
    const joueur = player({ s: 'D9', d: 'P10', m: 'D8' });

    expect(isEligibleInDiscipline(pn.eligibility, joueur, 'singles')).toBe(true);
    expect(isEligibleInDiscipline(pn.eligibility, joueur, 'doubles')).toBe(false);
    expect(isEligibleInDiscipline(pn.eligibility, joueur, 'mixed')).toBe(true);
  });

  it('exige au moins P10 en R1', () => {
    expect(isEligibleInDiscipline(r1.eligibility, player({ s: 'P10' }), 'singles')).toBe(true);
    expect(isEligibleInDiscipline(r1.eligibility, player({ s: 'P11' }), 'singles')).toBe(false);
  });

  it('suffit d’une discipline à P10 ou mieux en R3', () => {
    expect(checkEligibility(r3, icr.categories, player({ s: 'P12', d: 'P12', m: 'P10' })).eligible).toBe(true);
    expect(checkEligibility(r3, icr.categories, player({ s: 'P12', d: 'P12', m: 'P11' })).eligible).toBe(false);
  });
});

describe('le classement absent, selon le sens de la contrainte', () => {
  const promo = getDivision('icd_masculin', 'D4')!;
  const pn = getDivision('icr_seniors', 'PN')!;

  it('ne dépasse aucun plafond : admis en départemental', () => {
    expect(isEligibleInDiscipline(promo.eligibility, player({}), 'singles')).toBe(true);
  });

  it("n'atteint aucun plancher : refusé en régional", () => {
    expect(isEligibleInDiscipline(pn.eligibility, player({}), 'singles')).toBe(false);
  });

  it('NC vaut un classement, et se compare comme tel', () => {
    // NC est le plus faible : sous tout plafond, sous tout plancher.
    expect(isEligibleInDiscipline(promo.eligibility, player({ s: 'NC' }), 'singles')).toBe(true);
    expect(isEligibleInDiscipline(pn.eligibility, player({ s: 'NC' }), 'singles')).toBe(false);
  });
});

describe('catégorie inconnue', () => {
  it('ne bloque pas : elle est signalée, pas refusée', () => {
    const d1 = getDivision('icd_mixte', 'D1')!;
    const verdict = checkEligibility(d1, CHAMPIONSHIP_RULES.icd_mixte.categories, player({ s: 'D9' }, 'Para-badminton'));

    expect(verdict.eligible).toBe(true);
  });
});
