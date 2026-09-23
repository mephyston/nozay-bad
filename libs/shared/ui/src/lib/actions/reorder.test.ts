import { describe, it, expect } from 'vitest';
import { rangCible } from './reorder';

/**
 * Cinq rangées de 60 px, la première commençant à 100 : centres 130, 190, 250, 310, 370.
 * C'est la géométrie que l'action mesure au `pointerdown`.
 */
const MILIEUX = [130, 190, 250, 310, 370];

describe('rangCible', () => {
  it('ne bouge pas tant qu’on n’a dépassé personne', () => {
    // On traîne la rangée 2 ; tant que son centre reste entre les milieux voisins,
    // elle garde son rang.
    expect(rangCible(250, MILIEUX, 2)).toBe(2);
    expect(rangCible(280, MILIEUX, 2)).toBe(2);
    expect(rangCible(220, MILIEUX, 2)).toBe(2);
  });

  it('descend d’un cran dès qu’on franchit le milieu de la suivante', () => {
    expect(rangCible(311, MILIEUX, 2)).toBe(3);
    expect(rangCible(371, MILIEUX, 2)).toBe(4);
  });

  it('monte d’un cran dès qu’on franchit le milieu de la précédente', () => {
    expect(rangCible(189, MILIEUX, 2)).toBe(1);
    expect(rangCible(129, MILIEUX, 2)).toBe(0);
  });

  it('s’arrête aux extrémités', () => {
    // Bien au-delà du bas : la dernière place, pas davantage.
    expect(rangCible(9999, MILIEUX, 2)).toBe(4);
    expect(rangCible(-9999, MILIEUX, 2)).toBe(0);
  });

  it('retient la place la plus haute atteinte en montant', () => {
    /*
      En montant, la première voisine franchie est la plus proche : sans l'arrêt, la
      boucle continuerait et la rangée retomberait au rang de la voisine suivante.
      C'est l'erreur qui ne lève rien — la ligne atterrit simplement un cran trop bas.
    */
    expect(rangCible(100, MILIEUX, 4)).toBe(0);
    expect(rangCible(200, MILIEUX, 4)).toBe(2);
  });

  it('traite une liste de deux, le cas le plus fréquent', () => {
    const deux = [130, 190];
    expect(rangCible(130, deux, 0)).toBe(0);
    expect(rangCible(191, deux, 0)).toBe(1);
    expect(rangCible(129, deux, 1)).toBe(0);
  });

  it('ne cale pas sur une liste d’un seul élément', () => {
    expect(rangCible(130, [130], 0)).toBe(0);
  });
});
