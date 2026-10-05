import { describe, it, expect } from 'vitest';
import { axeDesPlages, plageFr, surAxe, type EquipeAvecPlage } from './range-model';

const equipe = (range: EquipeAvecPlage['range'], value: number | null = null): EquipeAvecPlage => ({
  teamId: 1, name: 'X', value, upperTeamName: null, range, rangeVerdict: null
});

describe('plages de valeur', () => {
  it("borne l'axe par toutes les plages et valeurs saisies, avec une marge", () => {
    const axe = axeDesPlages([equipe({ min: 3, max: 5 }), equipe({ min: 4, max: 6 }, 6.5)])!;
    expect(axe.min).toBeLessThan(3);
    expect(axe.max).toBeGreaterThan(6.5);
    expect(surAxe(axe.min, axe)).toBe(0);
    expect(surAxe(axe.max, axe)).toBe(100);
  });

  it("n'a pas d'axe sans aucune plage ni valeur", () => {
    expect(axeDesPlages([equipe(null)])).toBeNull();
  });

  it('écrit une plage à la française, et un seul nombre quand elle se resserre', () => {
    expect(plageFr({ min: 3.5, max: 5.25 })).toBe('3,50 – 5,25');
    expect(plageFr({ min: 4, max: 4 })).toBe('4,00');
  });
});
