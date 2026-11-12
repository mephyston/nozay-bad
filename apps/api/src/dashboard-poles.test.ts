import { describe, it, expect } from 'vitest';
import { assemblePoles } from './dashboard-poles';

describe('assemblePoles', () => {
  it('garde l’ordre des pôles, totalise par sens et laisse à zéro un pôle sans mouvement', () => {
    const poles = assemblePoles([
      { poleId: 1, poleLabel: 'Pôle Compétition', label: 'Tournoi', type: 'recette', total: 500 },
      { poleId: 1, poleLabel: 'Pôle Compétition', label: 'Tournoi', type: 'depense', total: 200 },
      { poleId: 1, poleLabel: 'Pôle Compétition', label: 'Buvette', type: 'recette', total: 1000 },
      { poleId: 2, poleLabel: 'Pôle Jeunes', label: 'Stage', type: null, total: null },
      { poleId: 3, poleLabel: 'Pôle Vide', label: null, type: null, total: null }
    ]);
    expect(poles.map((p) => [p.label, p.recettes, p.depenses, p.solde])).toEqual([
      ['Pôle Compétition', 1500, 200, 1300],
      ['Pôle Jeunes', 0, 0, 0],
      ['Pôle Vide', 0, 0, 0]
    ]);
    expect(poles[0].details.map((d) => d.label)).toEqual(['Buvette', 'Tournoi']);
    expect(poles[1].details).toEqual([]);
  });
});
