import { describe, it, expect } from 'vitest';
import { averageElo, parMoyenneElo } from './elo';

describe('averageElo', () => {
  it('moyenne les seuls tableaux cotés', () => {
    expect(averageElo([1200, null, 1000])).toBe(1100);
    expect(averageElo([null, undefined, null])).toBeNull();
  });
});

describe('parMoyenneElo', () => {
  it('range du plus fort au plus faible, les joueurs sans cote à la fin, le nom départageant', () => {
    const joueurs = [
      { lastName: 'Sans', firstName: 'Cote', eloAverage: null },
      { lastName: 'Bas', firstName: 'A', eloAverage: 800 },
      { lastName: 'Haut', firstName: 'A', eloAverage: 1500 },
      { lastName: 'Egal', firstName: 'B', eloAverage: 800 }
    ];
    expect([...joueurs].sort(parMoyenneElo).map((j) => j.lastName)).toEqual(['Haut', 'Bas', 'Egal', 'Sans']);
  });
});
