import { describe, it, expect } from 'vitest';
import { addDays, groupOpenPlayWeeks, mondayOf, openPlayRangeEnd } from './open-play';

describe('semaines du jeu libre', () => {
  it('commence la semaine le lundi, dimanche compris', () => {
    expect(mondayOf('2026-03-18')).toBe('2026-03-16'); // mercredi
    expect(mondayOf('2026-03-16')).toBe('2026-03-16'); // lundi
    expect(mondayOf('2026-03-22')).toBe('2026-03-16'); // dimanche
  });

  it('traverse le changement d’heure sans glisser d’un jour', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
  });

  it('lit jusqu’au dimanche de la dernière semaine', () => {
    expect(openPlayRangeEnd('2026-03-18', 1)).toBe('2026-03-22');
    expect(openPlayRangeEnd('2026-03-18', 2)).toBe('2026-03-29');
  });
});

describe('groupOpenPlayWeeks', () => {
  const s = (date: string, id: number) => ({ id, date });

  it('ne donne une colonne qu’aux jours qui ont une séance', () => {
    const weeks = groupOpenPlayWeeks([s('2026-03-21', 1), s('2026-03-22', 2)], '2026-03-18', 1);

    expect(weeks[0].days.map((d) => d.date)).toEqual(['2026-03-21', '2026-03-22']);
  });

  it('range deux séances du même jour dans la même colonne', () => {
    const weeks = groupOpenPlayWeeks([s('2026-03-21', 1), s('2026-03-21', 2)], '2026-03-18', 1);

    expect(weeks[0].days).toHaveLength(1);
    expect(weeks[0].days[0].sessions.map((x) => x.id)).toEqual([1, 2]);
  });

  it('garde une semaine vide : « pas de jeu libre » est une information', () => {
    const weeks = groupOpenPlayWeeks([s('2026-03-21', 1)], '2026-03-18', 2);

    expect(weeks.map((w) => w.monday)).toEqual(['2026-03-16', '2026-03-23']);
    expect(weeks[1].days).toEqual([]);
    expect(weeks.map((w) => w.current)).toEqual([true, false]);
  });

  it('ignore ce qui déborde de la période', () => {
    const weeks = groupOpenPlayWeeks([s('2026-03-30', 1)], '2026-03-18', 2);

    expect(weeks.flatMap((w) => w.days)).toEqual([]);
  });
});
