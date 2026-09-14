import { describe, it, expect } from 'vitest';
import { AGE_CATEGORIES, ageCategoryOf, agePyramid, birthYearsOf, seasonReferenceYear } from './age-categories';

describe('catégories d’âge FFBaD', () => {
  it("classe sur l'année de naissance, à l'âge atteint au 31 décembre de l'année de début de saison", () => {
    // Saison 2026-2027 : année de référence 2026.
    expect(ageCategoryOf(2018, 2026).code).toBe('U9');
    expect(ageCategoryOf(2017, 2026).code).toBe('U11');
    expect(ageCategoryOf(2016, 2026).code).toBe('U11');
    expect(ageCategoryOf(2015, 2026).code).toBe('U13');
    expect(ageCategoryOf(2008, 2026).code).toBe('U19');
    expect(ageCategoryOf(2007, 2026).code).toBe('S');
    expect(ageCategoryOf(1992, 2026).code).toBe('S');
    expect(ageCategoryOf(1991, 2026).code).toBe('V1');
    expect(ageCategoryOf(1956, 2026).code).toBe('V8');
    // La saison suivante décale tout d'un an.
    expect(ageCategoryOf(2017, 2027).code).toBe('U11');
    expect(ageCategoryOf(2016, 2027).code).toBe('U13');
  });

  it('couvre tous les âges sans trou ni chevauchement', () => {
    for (let age = 0; age <= 100; age++) {
      const matches = AGE_CATEGORIES.filter((c) => age >= c.minAge && (c.maxAge === undefined || age <= c.maxAge));
      expect(matches, `âge ${age}`).toHaveLength(1);
    }
  });

  it("dit les années de naissance d'une catégorie pour l'affichage", () => {
    const u11 = AGE_CATEGORIES.find((c) => c.code === 'U11')!;
    expect(birthYearsOf(u11, 2026)).toBe('2016 – 2017');
    expect(birthYearsOf(AGE_CATEGORIES[0], 2026)).toBe('2018 et après');
    expect(birthYearsOf(AGE_CATEGORIES.at(-1)!, 2026)).toBe('1956 et avant');
  });

  it("lit l'année de référence de la date de début, ou du code à défaut", () => {
    expect(seasonReferenceYear({ startDate: '2026-09-01', code: '26-27' })).toBe(2026);
    expect(seasonReferenceYear({ code: '26-27' })).toBe(2026);
    expect(seasonReferenceYear({})).toBeNull();
  });

  it('dresse la pyramide, toutes catégories présentes, F et H séparés', () => {
    const rows = agePyramid(
      [
        { birthYear: 2019, gender: 'F', n: 1 },
        { birthYear: 2018, gender: 'M', n: 2 },
        { birthYear: 1982, gender: 'M', n: 1 },
        { birthYear: 1982, gender: 'F', n: 1 }
      ],
      2026
    );
    expect(rows).toHaveLength(AGE_CATEGORIES.length);
    expect(rows[0]).toMatchObject({ code: 'U9', f: 1, m: 2, total: 3, youth: true });
    expect(rows.find((r) => r.code === 'V2')).toMatchObject({ f: 1, m: 1, total: 2 });
    expect(rows.find((r) => r.code === 'S')).toMatchObject({ f: 0, m: 0, total: 0 });
  });
});
