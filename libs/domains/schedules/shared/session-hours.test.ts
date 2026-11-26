import { describe, expect, it } from 'vitest';
import { defaultIndivStartTime, defaultOpenPlayHours } from './session-hours';

describe('horaire proposé à la création', () => {
  it('le dimanche matin', () => {
    expect(defaultOpenPlayHours('2026-11-29')).toEqual({ startTime: '10:00', endTime: '13:00' });
    expect(defaultIndivStartTime('2026-11-29')).toBe('10:00');
  });

  it('le soir les autres jours, samedi compris', () => {
    for (const date of ['2026-11-23', '2026-11-25', '2026-11-28']) {
      expect(defaultOpenPlayHours(date)).toEqual({ startTime: '19:30', endTime: '22:30' });
      expect(defaultIndivStartTime(date)).toBe('19:30');
    }
  });

  it('le soir tant que la date manque ou ne se lit pas', () => {
    expect(defaultOpenPlayHours('')).toEqual({ startTime: '19:30', endTime: '22:30' });
    expect(defaultIndivStartTime('pas une date')).toBe('19:30');
  });
});
