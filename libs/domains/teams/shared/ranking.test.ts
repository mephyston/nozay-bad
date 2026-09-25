import { describe, it, expect } from 'vitest';
import { bestRanking, rankingSeries, RANKING_SERIES_COLORS } from './ranking';

describe('séries et couleurs des classements', () => {
  it('donne la série de chaque classement, et aucune à NC ou à une case vide', () => {
    expect(rankingSeries('N2')).toBe('N');
    expect(rankingSeries('R5')).toBe('R');
    expect(rankingSeries('D9')).toBe('D');
    expect(rankingSeries('P12')).toBe('P');
    expect(rankingSeries('NC')).toBeNull();
    expect(rankingSeries(null)).toBeNull();
    expect(rankingSeries('X1')).toBeNull();
  });

  it('suit le code des plumes : rouge N, bleu R, vert D, jaune P', () => {
    expect(RANKING_SERIES_COLORS.N.fond).toBe('#d32f2f');
    expect(RANKING_SERIES_COLORS.R.fond).toBe('#1565c0');
    expect(RANKING_SERIES_COLORS.D.fond).toBe('#2e7d32');
    expect(RANKING_SERIES_COLORS.P.fond).toBe('#f9c80e');
    // Le jaune porte un texte sombre : le blanc ne s'y lirait pas.
    expect(RANKING_SERIES_COLORS.P.texte).not.toBe('#ffffff');
  });

  it('retient le meilleur des trois classements', () => {
    expect(bestRanking(['P10', 'D8', 'P11'])).toBe('D8');
    expect(bestRanking(['R6', 'R4', 'N3'])).toBe('N3');
    expect(bestRanking(['D7', 'D9', null])).toBe('D7');
    expect(bestRanking(['NC', null, 'NC'])).toBe('NC');
    expect(bestRanking([null, null, null])).toBeNull();
  });
});
