import { describe, it, expect } from 'vitest';
import {
  composantesDeDate,
  composerDateHeure,
  jourCourt,
  moisEnToutesLettres,
  partieDate,
  partieHeure
} from './date-heure';

describe('date-heure', () => {
  it('sépare les deux moitiés', () => {
    expect(partieDate('2026-05-12T18:30')).toBe('2026-05-12');
    expect(partieHeure('2026-05-12T18:30')).toBe('18:30');
  });

  it('coupe les secondes que l’API ajoute parfois', () => {
    expect(partieHeure('2026-05-12T18:30:00')).toBe('18:30');
  });

  it('rend des moitiés vides plutôt que de caler', () => {
    expect(partieDate('')).toBe('');
    expect(partieHeure('')).toBe('');
    expect(partieDate(undefined)).toBe('');
    expect(partieHeure('2026-05-12')).toBe('');
  });

  it('recompose une valeur toujours complète', () => {
    expect(composerDateHeure('2026-05-12', '18:30')).toBe('2026-05-12T18:30');
  });

  it('ne laisse jamais une moitié vide produire une valeur invalide', () => {
    /*
      « 2026-05-12T » n'est pas une date-heure : le navigateur vide le champ sans rien
      dire, et l'on croit avoir saisi une date qui n'a pas été retenue.
    */
    expect(composerDateHeure('2026-05-12', '')).toBe('2026-05-12T18:00');
    expect(composerDateHeure('2026-05-12', '', { heureParDefaut: '09:00' })).toBe('2026-05-12T09:00');

    // Choisir une heure sans date : c'est aujourd'hui qu'on la pose.
    const fige = () => new Date('2026-08-30T12:00:00Z');
    expect(composerDateHeure('', '20:00', { aujourdhui: fige })).toBe('2026-08-30T20:00');
  });
});

describe('composantesDeDate', () => {
  it('extrait les trois nombres d’une date ISO', () => {
    expect(composantesDeDate('2026-10-11')).toEqual({ annee: 2026, mois: 10, jour: 11 });
    expect(composantesDeDate(' 2026-10-11 ')).toEqual({ annee: 2026, mois: 10, jour: 11 });
  });

  it('refuse ce qui n’est pas une date ISO', () => {
    expect(composantesDeDate('11/10/2026')).toBeNull();
    expect(composantesDeDate('2026-10')).toBeNull();
    expect(composantesDeDate('2026-10-11T14:00')).toBeNull();
    expect(composantesDeDate('')).toBeNull();
  });
});

describe('jourCourt et moisEnToutesLettres', () => {
  it('écrivent le jour et le mois en français', () => {
    expect(jourCourt('2026-10-11')).toContain('11');
    expect(jourCourt('2026-10-11')).toContain('oct');
    expect(moisEnToutesLettres('2026-10')).toContain('octobre');
    expect(moisEnToutesLettres('2026-10')).toContain('2026');
  });

  it('rendent la valeur telle quelle quand elle n’est pas lisible', () => {
    // Mieux vaut montrer la donnée brute qu'un « Invalid Date » ou une ligne vide.
    expect(jourCourt('pas une date')).toBe('pas une date');
    expect(moisEnToutesLettres('bricole')).toBe('bricole');
  });
});
