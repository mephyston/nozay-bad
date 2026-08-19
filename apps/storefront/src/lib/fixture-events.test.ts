import { describe, it, expect } from 'vitest';
import { toFixtureEntries } from './fixture-events';
import type { MyFixture } from './my-fixtures';

const base: MyFixture = {
  teamId: 3,
  teamName: 'NBA91-3',
  championshipLabel: 'Départemental Mixte',
  divisionLabel: 'D2',
  dayNumber: 4,
  dayLabel: null,
  weekStart: '2026-11-02',
  weekEnd: '2026-11-08',
  date: null,
  dateSource: null,
  opponent: null,
  home: true,
  venue: null,
  selected: false,
  slotLabel: null,
  lineupStatus: null,
  lineupExists: false
};

describe('rencontres d’interclubs dans l’agenda', () => {
  it('retient la date du capitaine, heure comprise', () => {
    const [entry] = toFixtureEntries([
      { ...base, date: '2026-11-06T20:30', dateSource: 'captain' }
    ]);

    expect(entry.event.startsAt).toBe('2026-11-06T20:30');
    expect(entry.event.allDay).toBe(false);
    expect(entry.provisional).toBe(false);
  });

  it('place les vétérans sur leur dimanche, sans horaire inventé', () => {
    const [entry] = toFixtureEntries([
      { ...base, championshipLabel: 'Départemental Vétérans', date: '2026-11-08', dateSource: 'committee' }
    ]);

    expect(entry.event.startsAt).toBe('2026-11-08T00:00');
    // Aucun horaire au calendrier : en inventer un ferait arriver les joueurs à la
    // mauvaise heure.
    expect(entry.event.allDay).toBe(true);
    expect(entry.provisional).toBe(false);
  });

  it('retombe sur le lundi de la semaine, et le signale', () => {
    const [entry] = toFixtureEntries([base]);

    // Le mixte et le masculin se jouent en semaine sans jour commun : seul le capitaine
    // peut préciser lequel, et tant qu'il ne l'a pas fait la ligne le dit.
    expect(entry.event.startsAt).toBe('2026-11-02T00:00');
    expect(entry.provisional).toBe(true);
  });

  it('emprunte la catégorie interclubs et n’ouvre aucune inscription', () => {
    const [entry] = toFixtureEntries([base]);

    // Même couleur et même ligne que les événements interclubs du club : c'est le même
    // rendez-vous pour l'adhérent.
    expect(entry.event.category).toBe('interclubs');
    // On ne s'inscrit pas à une rencontre, on y est aligné.
    expect(entry.event.registration).toBe('none');
  });

  it('nomme l’adversaire et distingue domicile et extérieur', () => {
    const [home] = toFixtureEntries([{ ...base, opponent: 'Massy 2' }]);
    const [away] = toFixtureEntries([{ ...base, opponent: 'Massy 2', home: false }]);

    expect(home.event.title).toBe('NBA91-3 · J4 contre Massy 2');
    expect(away.event.title).toBe('NBA91-3 · J4 chez Massy 2');
  });
});
