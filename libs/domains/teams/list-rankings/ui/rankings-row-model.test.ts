import { describe, it, expect } from 'vitest';
import {
  choixDeDate,
  classementOuTiret,
  classementsDeJoueur,
  cpphDeJoueur,
  detailDeJoueur,
  nomDeJoueur,
  signalementsDeJoueur,
  tonDeClassements,
  type ClassementLike
} from './rankings-row-model';

const joueur = (patch: Partial<ClassementLike> = {}): ClassementLike => ({
  id: 1,
  licence: '01234567',
  firstName: 'Robert',
  lastName: 'DUPONT',
  gender: 'H',
  category: 'Senior',
  singles: 'D9',
  doubles: 'P10',
  mixed: null,
  cpphSingles: 120,
  cpphDoubles: 80,
  cpphMixed: null,
  isMember: true,
  mutation: 'none',
  source: 'import',
  ...patch
});

describe('projection d’un classement', () => {
  it('cherche par nom puis prénom', () => {
    expect(nomDeJoueur(joueur())).toBe('DUPONT Robert');
  });

  it('situe par catégorie et licence', () => {
    expect(detailDeJoueur(joueur())).toBe('Senior · 01234567');
    expect(detailDeJoueur(joueur({ category: null }))).toBe('01234567');
  });

  it('affiche les trois classements dans l’ordre S/D/M', () => {
    expect(classementsDeJoueur(joueur())).toBe('D9/P10/—');
  });

  it('ne confond pas l’absence de classement avec NC', () => {
    /*
      `NC` est un classement à part entière — zéro point, mais alignable ; l'absence
      désigne un licencié non compétiteur. Les confondre ferait entrer en équipe
      quelqu'un qui n'y a pas sa place.
    */
    expect(classementOuTiret(null)).toBe('—');
    expect(classementOuTiret('NC')).toBe('NC');
    expect(classementsDeJoueur(joueur({ singles: 'NC', doubles: null, mixed: null }))).toBe(
      'NC/—/—'
    );
  });

  it('met en retrait un joueur sans aucun classement', () => {
    expect(tonDeClassements(joueur({ singles: null, doubles: null, mixed: null }))).toBe('muted');
    expect(tonDeClassements(joueur({ singles: null, doubles: null, mixed: 'NC' }))).toBe(
      'foreground'
    );
  });

  it('ne dit les points CPPH que lorsqu’il y en a', () => {
    expect(cpphDeJoueur(joueur())).toBe('CPPH 120/80/—');
    expect(
      cpphDeJoueur(joueur({ cpphSingles: null, cpphDoubles: null, cpphMixed: null }))
    ).toBeUndefined();
  });
});

describe('signalements', () => {
  it('ne badge pas le cas courant', () => {
    expect(signalementsDeJoueur(joueur())).toEqual([]);
  });

  it('signale d’abord le non-adhérent', () => {
    // C'est la seule chose qui compte quand on lit cette liste pour composer : ce
    // joueur n'est alignable dans aucune composition.
    const liste = signalementsDeJoueur(joueur({ isMember: false, mutation: 'in', source: 'manuel' }));
    expect(liste.map((s) => s.label)).toEqual(['Pas adhérent', 'Muté', 'Saisi à la main']);
    expect(liste[0].variant).toBe('destructive');
  });

  it('distingue chaque signalement', () => {
    expect(signalementsDeJoueur(joueur({ mutation: 'out' })).map((s) => s.label)).toEqual(['Muté']);
    expect(signalementsDeJoueur(joueur({ source: 'manuel' })).map((s) => s.label)).toEqual([
      'Saisi à la main'
    ]);
  });
});

describe('choix de date', () => {
  it('accompagne chaque date de son nombre de joueurs', () => {
    // Deux imports d'une même semaine se distinguent par là, et choisir le mauvais
    // fausse toutes les valeurs d'équipe.
    expect(choixDeDate([{ eloDate: '2026-09-01', players: 214 }])).toEqual([
      { value: '2026-09-01', label: '2026-09-01', hint: '214 joueurs' }
    ]);
  });

  it('accorde le décompte, singulier à zéro et à un', () => {
    expect(choixDeDate([{ eloDate: 'x', players: 1 }])[0].hint).toBe('1 joueur');
    expect(choixDeDate([{ eloDate: 'x', players: 0 }])[0].hint).toBe('0 joueur');
  });
});
