import { describe, it, expect } from 'vitest';
import { CHAMPIONSHIP_RULES, checkMatchDay, isoWeekday, getDivision, teamName } from './championship';

describe('jours de rencontre', () => {
  it('numérote les jours en ISO, dimanche compris', () => {
    expect(isoWeekday('2026-11-02')).toBe(1); // lundi
    expect(isoWeekday('2026-11-07')).toBe(6); // samedi
    expect(isoWeekday('2026-11-08')).toBe(7); // dimanche, et non 0
  });

  it('joue le départemental mixte en semaine, le soir (art. 3.4.1)', () => {
    const mixte = CHAMPIONSHIP_RULES.icd_mixte;

    expect(checkMatchDay(mixte, '2026-11-03')).toBe('allowed'); // mardi
    expect(checkMatchDay(mixte, '2026-11-06')).toBe('allowed'); // vendredi
    // Le week-end n'est pas prévu au départemental : signalé, jamais bloqué.
    expect(checkMatchDay(mixte, '2026-11-07')).toBe('unusual'); // samedi
    expect(checkMatchDay(mixte, '2026-11-08')).toBe('unusual'); // dimanche
  });

  it('joue le masculin comme le mixte', () => {
    expect(checkMatchDay(CHAMPIONSHIP_RULES.icd_masculin, '2026-11-05')).toBe('allowed');
    expect(checkMatchDay(CHAMPIONSHIP_RULES.icd_masculin, '2026-11-08')).toBe('unusual');
  });

  it('joue les vétérans le dimanche, le samedi par dérogation (art. 3.3.1)', () => {
    const veterans = CHAMPIONSHIP_RULES.icd_veterans;

    expect(checkMatchDay(veterans, '2026-11-29')).toBe('allowed'); // dimanche
    expect(checkMatchDay(veterans, '2026-11-28')).toBe('derogation'); // samedi
    expect(checkMatchDay(veterans, '2026-11-25')).toBe('unusual'); // mercredi
  });

  it('joue le régional le samedi comme le dimanche : deux rencontres par journée', () => {
    const icr = CHAMPIONSHIP_RULES.icr_seniors;

    expect(icr.fixturesPerDay).toBe(2);
    expect(checkMatchDay(icr, '2026-11-07')).toBe('allowed'); // samedi
    expect(checkMatchDay(icr, '2026-11-08')).toBe('allowed'); // dimanche
    expect(checkMatchDay(icr, '2026-11-05')).toBe('unusual'); // jeudi
  });

  it('permet à deux championnats de partager une semaine sans partager un jour', () => {
    // C'est toute la raison pour laquelle une journée est une semaine : le mixte joue
    // le mardi soir, les vétérans le dimanche — et pourtant un joueur ne peut pas
    // tenir les deux équipes cette semaine-là.
    expect(checkMatchDay(CHAMPIONSHIP_RULES.icd_mixte, '2026-11-24')).toBe('allowed');
    expect(checkMatchDay(CHAMPIONSHIP_RULES.icd_veterans, '2026-11-29')).toBe('allowed');
  });
});

describe('formats de rencontre', () => {
  it.each([
    ['icd_mixte', 'D1', 8],
    ['icd_mixte', 'D2', 7],
    ['icd_masculin', 'D2', 6],
    ['icd_veterans', 'D1', 9],
    ['icr_seniors', 'PN', 8]
  ] as const)('%s %s compte %i matchs', (championship, division, count) => {
    expect(getDivision(championship, division)!.format).toHaveLength(count);
  });

  it('ordonne les lignes comme les règlements : simples, doubles, mixtes', () => {
    const format = getDivision('icd_mixte', 'D2')!.format;

    expect(format.map((s) => `${s.discipline}${s.position}`)).toEqual([
      'SH1', 'SH2', 'SH3', 'SD1', 'DH1', 'DD1', 'MX1'
    ]);
  });
});

describe('nom des équipes', () => {
  it('dérive du numéro, jamais saisi', () => {
    expect(teamName('CLUB', 1)).toBe('CLUB-1');
    expect(teamName('XYZ12', 3)).toBe('XYZ12-3');
  });
});
