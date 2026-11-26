// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dayShort, fixtureWhen, fixtureWhenShort, homeFixturesWindow, teamColor, venueShort } from './club-fixtures';

describe("rencontres du club dans l'espace adhérent", () => {
  it("annonce le week-end dès le vendredi, et le jour même en semaine", () => {
    expect(homeFixturesWindow('2026-11-27')).toEqual({ from: '2026-11-27', to: '2026-11-29', weekend: true });
    expect(homeFixturesWindow('2026-11-28')).toEqual({ from: '2026-11-28', to: '2026-11-29', weekend: true });
    expect(homeFixturesWindow('2026-11-29')).toEqual({ from: '2026-11-29', to: '2026-11-29', weekend: true });
    expect(homeFixturesWindow('2026-11-25')).toEqual({ from: '2026-11-25', to: '2026-11-25', weekend: false });
  });

  it('dit quand, en clair', () => {
    expect(fixtureWhen({ date: '2026-11-28T20:30', weekStart: '2026-11-23' })).toBe('samedi 28 novembre · 20 h 30');
    expect(fixtureWhen({ date: '2026-11-29', weekStart: '2026-11-23' })).toBe('dimanche 29 novembre');
    expect(fixtureWhen({ date: null, weekStart: '2026-11-23' })).toBe('semaine du 23 novembre');
  });

  it("sur l'accueil, l'heure suffit le jour même ; puis « Demain », puis le jour", () => {
    expect(fixtureWhenShort({ date: '2026-11-27T20:30' }, '2026-11-27')).toBe('20 h 30');
    expect(fixtureWhenShort({ date: '2026-11-27' }, '2026-11-27')).toBe("Aujourd'hui");
    expect(fixtureWhenShort({ date: '2026-11-28T14:00' }, '2026-11-27')).toBe('Demain · 14 h');
    expect(fixtureWhenShort({ date: '2026-11-29T10:00' }, '2026-11-27')).toBe('Dimanche · 10 h');
    expect(fixtureWhenShort({ date: '2026-12-12T14:00' }, '2026-11-27')).toBe('sam. 12 déc. · 14 h');
    expect(fixtureWhenShort({ date: null, weekStart: '2026-11-23' }, '2026-11-20')).toBe('semaine du 23 nov.');
    expect(dayShort({ dayLabel: null, dayNumber: 3 })).toBe('J3');
    expect(dayShort({ dayLabel: 'Barrages aller', dayNumber: 9 })).toBe('Barrages aller');
  });

  it("réduit le lieu à la ville, quelle que soit la saisie", () => {
    expect(venueShort('Palaiseau')).toBe('Palaiseau');
    expect(venueShort('Halle des sports, Nozay')).toBe('Nozay');
    expect(venueShort('Gymnase Biodiversité, 44 rue Marcel Bontemps, 92100 Boulogne Billancourt')).toBe('Boulogne Billancourt');
    expect(venueShort('Brétigny  s/Orge')).toBe('Brétigny s/Orge');
    expect(venueShort(null)).toBeNull();
  });

  it('donne toujours la même couleur à une équipe', () => {
    expect(teamColor(1)).toBe(teamColor(11));
    expect(teamColor(1)).not.toBe(teamColor(2));
  });
});
