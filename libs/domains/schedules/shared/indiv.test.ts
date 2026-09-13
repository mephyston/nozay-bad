import { describe, it, expect } from 'vitest';
import {
  addMinutes,
  formatWindow,
  isIndivEligibleGroup,
  isValidLayout,
  sessionEndTime,
  slotWindows
} from './indiv';

describe('éligibilité aux séances individuelles', () => {
  it('reconnaît les deux libellés réels du club, casse et accents compris', () => {
    // Les deux valeurs telles qu'elles sortent de l'export Poona, et leurs variantes.
    expect(isIndivEligibleGroup('Compétiteurs adultes')).toBe(true);
    expect(isIndivEligibleGroup('Compétiteur adulte 1 entrainement /semaine')).toBe(true);
    expect(isIndivEligibleGroup('COMPÉTITEUR')).toBe(true);
    expect(isIndivEligibleGroup('competiteur jeune')).toBe(true);
  });

  it('écarte les autres groupes, dont les élites jeunes — limite assumée', () => {
    expect(isIndivEligibleGroup('Elite Jeunes (Collège)')).toBe(false);
    expect(isIndivEligibleGroup('Loisirs 1 (Lundi)')).toBe(false);
    expect(isIndivEligibleGroup('Licence seulement')).toBe(false);
    expect(isIndivEligibleGroup('')).toBe(false);
    expect(isIndivEligibleGroup(null)).toBe(false);
    expect(isIndivEligibleGroup(undefined)).toBe(false);
  });
});

describe('créneaux dérivés', () => {
  it('additionne des minutes sans perdre le zéro de tête', () => {
    expect(addMinutes('19:30', 30)).toBe('20:00');
    expect(addMinutes('09:45', 20)).toBe('10:05');
    expect(addMinutes('19:30', 0)).toBe('19:30');
  });

  it('découpe la soirée du club en deux fois trente minutes', () => {
    expect(slotWindows({ startTime: '19:30', slotCount: 2, slotMinutes: 30 })).toEqual([
      { index: 1, startTime: '19:30', endTime: '20:00' },
      { index: 2, startTime: '20:00', endTime: '20:30' }
    ]);
    expect(sessionEndTime({ startTime: '19:30', slotCount: 2, slotMinutes: 30 })).toBe('20:30');
  });

  it('refuse une soirée qui franchirait minuit ou sort des bornes', () => {
    expect(isValidLayout({ startTime: '19:30', slotCount: 2, slotMinutes: 30 })).toBe(true);
    expect(isValidLayout({ startTime: '23:30', slotCount: 2, slotMinutes: 30 })).toBe(false);
    expect(isValidLayout({ startTime: '19:30', slotCount: 0, slotMinutes: 30 })).toBe(false);
    expect(isValidLayout({ startTime: '19:30', slotCount: 7, slotMinutes: 30 })).toBe(false);
    expect(isValidLayout({ startTime: '19:30', slotCount: 2, slotMinutes: 121 })).toBe(false);
    expect(isValidLayout({ startTime: '7:30', slotCount: 2, slotMinutes: 30 })).toBe(false);
  });

  it('écrit la fenêtre comme l’annonce la lit', () => {
    expect(formatWindow({ index: 1, startTime: '19:30', endTime: '20:00' })).toBe('19h30-20h00');
  });
});

describe('isIndivEligibleGroup — mot réglé par le club', () => {
  it('cherche le mot du club, sans accent ni casse', () => {
    expect(isIndivEligibleGroup('Élite jeunes', 'elite')).toBe(true);
    expect(isIndivEligibleGroup('Compétiteurs adultes', 'élite')).toBe(false);
    expect(isIndivEligibleGroup('Compétiteurs adultes', '')).toBe(false);
  });
});
