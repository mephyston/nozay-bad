import { describe, it, expect } from 'vitest';
import { mondayOf, sundayOf, isSameWeek, weeklyExclusionGroup } from './week';

describe('la semaine, clé de jointure entre championnats', () => {
  it('ramène n’importe quel jour au lundi de sa semaine', () => {
    // Semaine du lundi 12 au dimanche 18 octobre 2026.
    expect(mondayOf('2026-10-12')).toBe('2026-10-12');
    expect(mondayOf('2026-10-15')).toBe('2026-10-12');
    expect(mondayOf('2026-10-18')).toBe('2026-10-12');
  });

  it('traite le dimanche comme la fin de SA semaine, pas le début de la suivante', () => {
    // Le piège classique : getUTCDay() vaut 0 le dimanche. Un dimanche de rencontre
    // rattaché au lundi suivant décalerait toute la journée d'une semaine.
    expect(mondayOf('2026-10-18')).toBe('2026-10-12');
    expect(mondayOf('2026-10-19')).toBe('2026-10-19');
  });

  it('est idempotent', () => {
    expect(mondayOf(mondayOf('2026-10-15'))).toBe('2026-10-12');
  });

  it('franchit les mois et les années', () => {
    expect(mondayOf('2027-01-01')).toBe('2026-12-28');
    expect(sundayOf('2026-12-28')).toBe('2027-01-03');
  });

  it('borne la semaine au dimanche', () => {
    expect(sundayOf('2026-10-12')).toBe('2026-10-18');
    expect(sundayOf('2026-10-15')).toBe('2026-10-18');
  });

  it('reconnaît deux dates de la même semaine', () => {
    expect(isSameWeek('2026-10-12', '2026-10-18')).toBe(true);
    expect(isSameWeek('2026-10-18', '2026-10-19')).toBe(false);
  });
});

describe("groupes d'exclusion hebdomadaire", () => {
  it('réunit mixte, masculin et régional : un joueur n’y tient qu’une équipe par semaine', () => {
    const group = weeklyExclusionGroup('icd_mixte');

    expect(group).toContain('icd_masculin');
    expect(group).toContain('icr_seniors');
  });

  it('laisse les vétérans à part, comme leur règlement', () => {
    // Le texte vétérans ne cite aucun autre championnat : étendre la contrainte
    // bloquerait des compositions autorisées.
    expect(weeklyExclusionGroup('icd_veterans')).toEqual(['icd_veterans']);
    expect(weeklyExclusionGroup('icd_mixte')).not.toContain('icd_veterans');
  });
});
