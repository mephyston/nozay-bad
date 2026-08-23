import { describe, it, expect } from 'vitest';
import { listScheduledNotifications } from './scheduled-registry';

/**
 * Le registre est la seule vue que le bureau a des envois automatiques : ces tests
 * gardent la correspondance avec les branches de `scheduled.ts` et les `source` des
 * notifications métier — retirer une entrée doit se faire les yeux ouverts.
 */
describe('registre des notifications automatiques', () => {
  it('décrit chaque récurrence du cron, avec son drapeau', () => {
    const entries = listScheduledNotifications({});
    const cronIds = entries.filter((e) => e.trigger === 'cron').map((e) => e.id);

    // Miroir des branches de handleScheduled (scheduled.ts).
    expect(cronIds.sort()).toEqual(
      [
        'birthday:daily',
        'reminder:unpaid',
        'reminder:order-awaiting-payment',
        'teams:ranking-reminder',
        'teams:lineup-reminder',
        'schedules:open-play-opener-reminder'
      ].sort()
    );
    for (const entry of entries.filter((e) => e.trigger === 'cron')) {
      expect(entry.flag).toBeTruthy();
    }
  });

  it('les identifiants sont uniques', () => {
    const ids = listScheduledNotifications({}).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('résout les drapeaux : tout est inactif par défaut, actif quand la variable vaut "true"', () => {
    const off = listScheduledNotifications({});
    expect(off.filter((e) => e.trigger === 'cron').every((e) => !e.enabled)).toBe(true);
    // Les événementielles ne dépendent d'aucun drapeau.
    expect(off.filter((e) => e.trigger === 'event').every((e) => e.enabled)).toBe(true);

    const on = listScheduledNotifications({
      PUSH_REMINDERS_ENABLED: 'true',
      PUSH_BIRTHDAYS_ENABLED: 'true',
      PUSH_RANKING_REMINDERS_ENABLED: 'true',
      PUSH_LINEUP_REMINDERS_ENABLED: 'true',
      PUSH_OPEN_PLAY_ENABLED: 'true'
    });
    expect(on.every((e) => e.enabled)).toBe(true);
  });
});
