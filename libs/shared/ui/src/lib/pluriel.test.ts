import { describe, it, expect } from 'vitest';
import { auPluriel } from './pluriel';

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
