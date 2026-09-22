import { describe, it, expect } from 'vitest';
import { accorder, auPluriel } from './pluriel';

describe('auPluriel', () => {
  it('ajoute un x aux mots en -eau, -au et -eu', () => {
    // « créneaus » s'affichait dans la feuille de filtres des créneaux.
    expect(auPluriel('créneau')).toBe('créneaux');
    expect(auPluriel('bordereau')).toBe('bordereaux');
    expect(auPluriel('tuyau')).toBe('tuyaux');
    expect(auPluriel('jeu')).toBe('jeux');
  });

  it('laisse tranquilles les mots déjà terminés par s, x ou z', () => {
    expect(auPluriel('mois')).toBe('mois');
    expect(auPluriel('prix')).toBe('prix');
    expect(auPluriel('nez')).toBe('nez');
  });

  it('ajoute un s au cas courant', () => {
    expect(auPluriel('créneau'.replace('créneau', 'gymnase'))).toBe('gymnases');
    expect(auPluriel('écriture')).toBe('écritures');
    expect(auPluriel('résultat')).toBe('résultats');
  });

  it('ne cale pas sur une chaîne vide', () => {
    expect(auPluriel('')).toBe('');
  });
});

describe('accorder', () => {
  it('accorde le mot avec le nombre', () => {
    // « 1 visites » s'écrivait faute de connaître le compte.
    expect(accorder(1, 'visite')).toBe('visite');
    expect(accorder(3, 'visite')).toBe('visites');
    expect(accorder(2, 'créneau')).toBe('créneaux');
  });

  it('met le singulier à zéro, comme le français le veut', () => {
    expect(accorder(0, 'visite')).toBe('visite');
  });

  it('accepte un pluriel donné, pour les irréguliers', () => {
    expect(accorder(3, 'cheval', 'chevaux')).toBe('chevaux');
  });

  it('compte en valeur absolue', () => {
    expect(accorder(-1, 'visite')).toBe('visite');
    expect(accorder(-3, 'visite')).toBe('visites');
  });
});
