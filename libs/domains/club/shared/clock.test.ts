import { describe, it, expect } from 'vitest';
import { localClock, localDate } from './clock';

describe('localClock', () => {
  const instant = new Date('2026-01-15T06:30:00Z'); // un jeudi, 6 h 30 UTC

  it('rend la date, l’heure et le jour dans le fuseau du club', () => {
    expect(localClock(instant, 'Europe/Paris')).toEqual({ date: '2026-01-15', dateTime: '2026-01-15T07:30', hour: 7, weekday: 'THU' });
    expect(localClock(instant, 'Indian/Reunion')).toMatchObject({ hour: 10, weekday: 'THU' });
    // Guadeloupe : UTC-4, il est 2 h 30 du matin.
    expect(localClock(instant, 'America/Guadeloupe')).toMatchObject({ date: '2026-01-15', hour: 2, weekday: 'THU' });
    // Tahiti : UTC-10, on est encore la veille.
    expect(localClock(instant, 'Pacific/Tahiti')).toMatchObject({ date: '2026-01-14', hour: 20, weekday: 'WED' });
  });

  it('retombe sur la métropole pour un fuseau inconnu ou absent', () => {
    expect(localDate(instant, 'Mars/Olympus')).toBe('2026-01-15');
    expect(localDate(instant, null)).toBe('2026-01-15');
  });
});
