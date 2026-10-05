import { describe, it, expect } from 'vitest';
import { familleDAge } from './roster-category';

describe('familleDAge', () => {
  it("lit la catégorie sur l'année de naissance, à l'âge atteint au 31 décembre de la saison", () => {
    expect(familleDAge('1991-12-31', '26-27')).toBe('veteran');
    expect(familleDAge('1992-01-01', '26-27')).toBe('senior');
    expect(familleDAge('1950-06-15', '26-27')).toBe('veteran');
    expect(familleDAge('2015-03-01', '26-27')).toBe('benjamin');
  });

  it("ne devine rien d'une date ou d'une saison illisible", () => {
    expect(familleDAge('', '26-27')).toBeNull();
    expect(familleDAge('1980-01-01', 'saison')).toBeNull();
  });
});
