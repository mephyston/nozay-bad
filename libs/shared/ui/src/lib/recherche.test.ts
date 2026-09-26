import { describe, it, expect } from 'vitest';
import { correspondA } from './recherche';

describe('correspondA', () => {
  it('cherche le texte tel quel, pas une ressemblance', () => {
    expect(correspondA('ZOLA299', 'ZOLA299 Camille')).toBe(true);
    // Les mêmes lettres, dans l'ordre mais pas à la suite : ce n'est pas la personne.
    expect(correspondA('ZOLA299', 'ZOLA268 Camille (07000299)')).toBe(false);
  });

  it('ignore les capitales et les accents', () => {
    expect(correspondA('helene', 'Hélène DURAND')).toBe(true);
    expect(correspondA('ÉLODIE', 'elodie martin')).toBe(true);
  });

  it('cherche aussi dans la seconde ligne', () => {
    expect(correspondA('07000299', 'ZOLA Camille', '07000299')).toBe(true);
  });

  it('garde tout pour un terme vide', () => {
    expect(correspondA('  ', 'n’importe quoi')).toBe(true);
  });
});
