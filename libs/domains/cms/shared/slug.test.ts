import { describe, it, expect } from 'vitest';
import { slugify, normalisePath, buildPath, ROOT_PATH } from './slug';
import { CmsInvalidSlugError } from './errors';

describe('slugify', () => {
  it('retire les diacritiques', () => {
    expect(slugify('Présentation')).toBe('presentation');
    expect(slugify('Créneaux été')).toBe('creneaux-ete');
  });

  it("reproduit les slugs de l'ancien site", () => {
    expect(slugify('Adultes Loisirs')).toBe('adultes-loisirs');
    expect(slugify('Ecole Française de Badminton')).toBe('ecole-francaise-de-badminton');
    expect(slugify("Livret d'accueil Jeunes")).toBe('livret-daccueil-jeunes');
  });

  it('ne laisse jamais de tiret en tête ni en queue', () => {
    expect(slugify('  ¡Bad!  ')).toBe('bad');
    expect(slugify('---')).toBe('');
  });
});

describe('normalisePath', () => {
  it('impose la barre oblique finale — la forme indexée par Google', () => {
    expect(normalisePath('/presentation')).toBe('/presentation/');
    expect(normalisePath('/presentation/')).toBe('/presentation/');
  });

  it('ramène la racine à une seule forme', () => {
    expect(normalisePath('')).toBe(ROOT_PATH);
    expect(normalisePath('/')).toBe(ROOT_PATH);
  });

  it('retire la chaîne de requête et le fragment', () => {
    expect(normalisePath('/presentation/?utm_source=fb')).toBe('/presentation/');
    expect(normalisePath('/presentation/#bureau')).toBe('/presentation/');
  });

  it('replie les barres obliques répétées', () => {
    expect(normalisePath('//les-equipes//equipe-1//')).toBe('/les-equipes/equipe-1/');
  });

  it('est idempotent', () => {
    const once = normalisePath('/Les-Equipes/Equipe-1');
    expect(normalisePath(once)).toBe(once);
  });
});

describe('buildPath', () => {
  it('compose depuis la racine', () => {
    expect(buildPath(null, 'presentation')).toBe('/presentation/');
  });

  it('compose sous un parent', () => {
    expect(buildPath('/le-club/', 'partenaires')).toBe('/le-club/partenaires/');
  });

  it('refuse un slug qui produirait une URL douteuse', () => {
    expect(() => buildPath(null, 'Presentation')).toThrow(CmsInvalidSlugError);
    expect(() => buildPath(null, 'mes pages')).toThrow(CmsInvalidSlugError);
    expect(() => buildPath(null, '../etc')).toThrow(CmsInvalidSlugError);
  });
});
