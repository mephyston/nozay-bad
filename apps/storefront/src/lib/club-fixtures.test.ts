// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fixtureWhen, homeFixturesWindow, teamColor } from './club-fixtures';

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

  it('donne toujours la même couleur à une équipe', () => {
    expect(teamColor(1)).toBe(teamColor(11));
    expect(teamColor(1)).not.toBe(teamColor(2));
  });
});
