import { describe, it, expect } from 'vitest';
import { listScheduledNotifications } from './scheduled-registry';
import { ALL_FEATURES_ON, FEATURES, effectiveFeatures } from '@nba/club/settings';

const OFF = { sendsEnabled: false, features: ALL_FEATURES_ON };
const ON = { sendsEnabled: true, features: ALL_FEATURES_ON };

/**
 * Le registre est la seule vue que le bureau a des envois automatiques : ces tests
 * gardent la correspondance avec les branches de `scheduled.ts` et les `source` des
 * notifications métier — retirer une entrée doit se faire les yeux ouverts.
 */
describe('registre des notifications automatiques', () => {
  it('décrit chaque récurrence du cron, avec la fonctionnalité qui la porte', () => {
    const entries = listScheduledNotifications(OFF);
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
      expect(FEATURES, entry.id).toContain(entry.flag);
    }
  });

  it('les identifiants sont uniques', () => {
    const ids = listScheduledNotifications(OFF).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("résout l'état : rien ne part sur un environnement fermé, tout part quand le club a tout gardé", () => {
    const off = listScheduledNotifications(OFF);
    expect(off.filter((e) => e.trigger === 'cron').every((e) => !e.enabled)).toBe(true);
    // Les événementielles ne dépendent de rien.
    expect(off.filter((e) => e.trigger === 'event').every((e) => e.enabled)).toBe(true);

    const on = listScheduledNotifications(ON);
    expect(on.every((e) => e.enabled)).toBe(true);
  });

  it('éteint un envoi quand le club a éteint sa fonctionnalité, ou son préalable', () => {
    const entries = listScheduledNotifications({
      sendsEnabled: true,
      features: effectiveFeatures({ birthdays: false, teams: false })
    });
    const byId = Object.fromEntries(entries.map((e) => [e.id, e.enabled]));
    expect(byId['birthday:daily']).toBe(false);
    expect(byId['teams:ranking-reminder']).toBe(false); // préalable `teams`
    expect(byId['reminder:unpaid']).toBe(true);
  });
});
