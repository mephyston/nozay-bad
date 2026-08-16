import { describe, it, expect } from 'vitest';
import {
  resolveReferenceDate,
  pickRankingsAt,
  thursdayBefore,
  shiftIsoDate
} from './ranking-resolution';
import { CHAMPIONSHIP_RULES } from './championship';

const icd = CHAMPIONSHIP_RULES.icd_mixte;
const icr = CHAMPIONSHIP_RULES.icr_seniors;

describe('thursdayBefore', () => {
  it('recule du lundi de la journée au jeudi précédent (art. 4.4.2)', () => {
    // Lundi 12 octobre 2026 → jeudi 8 octobre 2026.
    expect(thursdayBefore('2026-10-12')).toBe('2026-10-08');
  });

  it('franchit les mois et les années sans dériver', () => {
    expect(shiftIsoDate('2027-01-04', -4)).toBe('2026-12-31');
  });
});

describe('resolveReferenceDate', () => {
  it('épingle une date unique pour toute la saison en départemental', () => {
    const result = resolveReferenceDate(icd, { referenceEloDate: '2026-08-13' }, {
      number: 5,
      weekStart: '2027-02-01'
    });

    // La journée est en février, la référence reste celle d'août : c'est la règle.
    expect(result).toEqual({ date: '2026-08-13', origin: 'season' });
  });

  it('suit la journée en régional', () => {
    const result = resolveReferenceDate(icr, { referenceEloDate: '2026-08-13' }, {
      number: 3,
      weekStart: '2026-10-12'
    });

    expect(result).toEqual({ date: '2026-10-08', origin: 'day' });
  });

  it('laisse le coach forcer une date sur une journée', () => {
    const result = resolveReferenceDate(icd, { referenceEloDate: '2026-08-13' }, {
      number: 5,
      weekStart: '2027-02-01',
      referenceEloDate: '2026-12-10'
    });

    expect(result).toEqual({ date: '2026-12-10', origin: 'forced' });
  });

  it('ne devine aucune date quand rien n’est épinglé', () => {
    expect(resolveReferenceDate(icd, null, null)).toEqual({ date: null, origin: 'none' });
    expect(resolveReferenceDate(icd, { referenceEloDate: null }, null).date).toBeNull();
  });
});

describe('pickRankingsAt', () => {
  const rows = [
    { licence: '00000001', eloDate: '2026-08-13', singles: 'D9' },
    { licence: '00000001', eloDate: '2026-12-10', singles: 'D8' },
    { licence: '00000002', eloDate: '2026-08-13', singles: 'P10' }
  ];

  it('retient le classement en vigueur à la date, pas le plus récent', () => {
    const picked = pickRankingsAt(rows, '2026-09-01');

    expect(picked.get('00000001')?.singles).toBe('D9');
  });

  it('suit la montée dès que la date de référence la dépasse', () => {
    expect(pickRankingsAt(rows, '2027-01-15').get('00000001')?.singles).toBe('D8');
  });

  it('conserve le classement antérieur d’un joueur absent d’un export partiel', () => {
    // Le joueur 2 n'est pas dans l'export de décembre : il garde celui d'août.
    expect(pickRankingsAt(rows, '2027-01-15').get('00000002')?.singles).toBe('P10');
  });

  it('ne retient rien sans date de référence, plutôt que de deviner', () => {
    expect(pickRankingsAt(rows, null).size).toBe(0);
  });

  it('ignore les classements postérieurs à la date de référence', () => {
    expect(pickRankingsAt(rows, '2026-08-01').size).toBe(0);
  });
});
